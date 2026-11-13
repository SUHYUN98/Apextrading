import type { Timeframe } from '@/types';
import { logMarketDataError, logMarketDataWarn } from './diagnostics';

export const BINANCE_FUTURES_WS = 'wss://fstream.binance.com/ws';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const STALE_AFTER_MS = 30000;

export interface FuturesKlineUpdate {
  symbol: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
  receivedAt: number;
}

export type FuturesSocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting';

export interface FuturesSocketState {
  status: FuturesSocketStatus;
  lastMessageAt: number | null;
  lastCloseCode: number | null;
  lastCloseReason: string | null;
  attempts: number;
}

interface Subscription {
  symbol: string;
  timeframe: Timeframe;
  onUpdate: (update: FuturesKlineUpdate) => void;
  onResync: () => void;
  hasOpened: boolean;
}

// Keeps one live socket for the selected Futures stream; dedupes repeated kline frames by open time.
export class BinanceFuturesSocket {
  private ws: WebSocket | null = null;
  private subscription: Subscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private attempts = 0;
  private lastEmittedKey: string | null = null;
  private lastMessageAt: number | null = null;
  private lastCloseCode: number | null = null;
  private lastCloseReason: string | null = null;
  private status: FuturesSocketStatus = 'idle';
  private listeners = new Set<(state: FuturesSocketState) => void>();

  onState(listener: (state: FuturesSocketState) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  subscribe(
    symbol: string,
    timeframe: Timeframe,
    onUpdate: (update: FuturesKlineUpdate) => void,
    onResync: () => void
  ): void {
    this.teardownSocket();
    this.subscription = { symbol: symbol.toUpperCase(), timeframe, onUpdate, onResync, hasOpened: false };
    this.lastEmittedKey = null;
    this.attempts = 0;
    this.connect();
  }

  unsubscribe(): void {
    this.teardownSocket();
    this.subscription = null;
    this.setStatus('idle');
  }

  private snapshot(): FuturesSocketState {
    return {
      status: this.status,
      lastMessageAt: this.lastMessageAt,
      lastCloseCode: this.lastCloseCode,
      lastCloseReason: this.lastCloseReason,
      attempts: this.attempts,
    };
  }

  private setStatus(status: FuturesSocketStatus): void {
    this.status = status;
    this.emit();
  }

  private emit(): void {
    const state = this.snapshot();
    this.listeners.forEach((fn) => fn(state));
  }

  private connect(): void {
    const sub = this.subscription;
    if (!sub) return;
    const stream = `${sub.symbol.toLowerCase()}@kline_${INTERVAL_MAP[sub.timeframe]}`;
    const url = `${BINANCE_FUTURES_WS}/${stream}`;
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      logMarketDataError('binance-futures-ws', {
        url,
        kind: 'construct-failed',
        message: err instanceof Error ? err.message : String(err),
      });
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      const reopened = sub.hasOpened;
      sub.hasOpened = true;
      this.attempts = 0;
      this.lastMessageAt = Date.now();
      this.setStatus('open');
      this.startStaleWatch();
      if (reopened) sub.onResync();
    };

    ws.onmessage = (event) => {
      this.lastMessageAt = Date.now();
      const update = this.parse(event.data, sub.symbol);
      if (!update) return;
      this.emit();
      const key = `${update.time}:${update.open}:${update.high}:${update.low}:${update.close}:${update.volume}:${update.isClosed}`;
      if (key === this.lastEmittedKey) return;
      this.lastEmittedKey = key;
      sub.onUpdate(update);
    };

    ws.onerror = () => {
      logMarketDataError('binance-futures-ws', {
        url,
        kind: 'error-event',
        note: 'Browsers do not expose WebSocket error details. The close event below carries the code and reason.',
      });
    };

    ws.onclose = (event) => {
      this.lastCloseCode = event.code;
      this.lastCloseReason = event.reason || null;
      logMarketDataError('binance-futures-ws', {
        url,
        kind: 'closed',
        code: event.code,
        reason: event.reason || '(no reason provided)',
        wasClean: event.wasClean,
        hint: event.code === 1006
          ? 'Code 1006 means the connection dropped without a close frame. Common causes: network loss, regional block, or a proxy/VPN dropping WebSocket traffic.'
          : undefined,
      });
      this.ws = null;
      this.stopStaleWatch();
      if (this.subscription === sub) this.scheduleReconnect();
    };
  }

  private parse(raw: unknown, symbol: string): FuturesKlineUpdate | null {
    if (typeof raw !== 'string') return null;
    let data: { e?: string; k?: Record<string, unknown> };
    try {
      data = JSON.parse(raw);
    } catch {
      logMarketDataWarn('binance-futures-ws', { kind: 'parse-error', sample: raw.slice(0, 120) });
      return null;
    }
    const k = data.k;
    if (data.e !== 'kline' || !k) return null;
    const update: FuturesKlineUpdate = {
      symbol,
      time: Math.floor(Number(k.t) / 1000),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
      volume: Number(k.v),
      isClosed: Boolean(k.x),
      receivedAt: Date.now(),
    };
    const valid = [update.time, update.open, update.high, update.low, update.close, update.volume].every(Number.isFinite);
    return valid ? update : null;
  }

  private startStaleWatch(): void {
    this.stopStaleWatch();
    this.staleTimer = setInterval(() => {
      if (this.ws && this.lastMessageAt && Date.now() - this.lastMessageAt > STALE_AFTER_MS) {
        logMarketDataWarn('binance-futures-ws', {
          kind: 'stale',
          silentMs: Date.now() - this.lastMessageAt,
          note: 'No frames received; forcing reconnect.',
        });
        this.ws?.close(4000, 'stale');
      }
    }, 5000);
  }

  private stopStaleWatch(): void {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
  }

  private scheduleReconnect(): void {
    if (!this.subscription) return;
    this.attempts += 1;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** (this.attempts - 1), RECONNECT_MAX_MS);
    this.setStatus('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private teardownSocket(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopStaleWatch();
    if (this.ws) {
      const ws = this.ws;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
      this.ws = null;
    }
  }
}

export const futuresSocket = new BinanceFuturesSocket();
