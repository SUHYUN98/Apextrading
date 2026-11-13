import type { Timeframe } from '@/types';
import { logMarketDataError, logMarketDataWarn } from './diagnostics';
import { FUTURES_INTERVAL_MAP, isValidOhlcv } from './binanceFuturesRest';

export const BINANCE_FUTURES_WS = 'wss://fstream.binance.com/ws';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const STALL_AFTER_MS = 30000;
const WATCHDOG_INTERVAL_MS = 5000;

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

// Keeps one live socket for the selected Futures stream. Each connection gets a generation number so that
// callbacks from sockets that were replaced or torn down are ignored.
export class BinanceFuturesSocket {
  private ws: WebSocket | null = null;
  private subscription: Subscription | null = null;
  private generation = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private attempts = 0;
  private lastEmittedKey: string | null = null;
  private lastMessageAt: number | null = null;
  private progressAt = 0;
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
    this.lastMessageAt = null;
    this.lastCloseCode = null;
    this.lastCloseReason = null;
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
    const generation = ++this.generation;
    const stream = `${sub.symbol.toLowerCase()}@kline_${FUTURES_INTERVAL_MAP[sub.timeframe]}`;
    const url = `${BINANCE_FUTURES_WS}/${stream}`;
    this.progressAt = Date.now();
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    this.startWatchdog(generation);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      logMarketDataError('binance-futures-ws', {
        url,
        kind: 'construct-failed',
        message: err instanceof Error ? err.message : String(err),
      });
      this.stopWatchdog();
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (!this.isCurrent(generation)) return;
      const reopened = sub.hasOpened;
      sub.hasOpened = true;
      this.progressAt = Date.now();
      this.setStatus('open');
      if (reopened) sub.onResync();
    };

    ws.onmessage = (event) => {
      if (!this.isCurrent(generation)) return;
      const update = this.parse(event.data, sub);
      if (!update) return;
      const now = Date.now();
      this.progressAt = now;
      this.lastMessageAt = now;
      this.attempts = 0;
      this.emit();
      const key = `${update.time}:${update.open}:${update.high}:${update.low}:${update.close}:${update.volume}:${update.isClosed}`;
      if (key === this.lastEmittedKey) return;
      this.lastEmittedKey = key;
      sub.onUpdate(update);
    };

    ws.onerror = () => {
      if (!this.isCurrent(generation)) return;
      logMarketDataError('binance-futures-ws', {
        url,
        kind: 'error-event',
        note: 'Browsers do not expose WebSocket error details. The close event below carries the code and reason.',
      });
    };

    ws.onclose = (event) => {
      if (!this.isCurrent(generation)) return;
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
      this.detachSocket();
      this.stopWatchdog();
      this.scheduleReconnect();
    };
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation && this.subscription !== null;
  }

  private parse(raw: unknown, sub: Subscription): FuturesKlineUpdate | null {
    if (typeof raw !== 'string') return null;
    let data: { e?: unknown; s?: unknown; k?: Record<string, unknown> | null };
    try {
      data = JSON.parse(raw);
    } catch {
      logMarketDataWarn('binance-futures-ws', { kind: 'parse-error', sample: raw.slice(0, 120) });
      return null;
    }
    const k = data?.k;
    if (!k || data.e !== 'kline') return null;
    if (typeof data.s !== 'string' || data.s.toUpperCase() !== sub.symbol) return null;
    if (k.i !== FUTURES_INTERVAL_MAP[sub.timeframe]) return null;
    const update: FuturesKlineUpdate = {
      symbol: sub.symbol,
      time: Math.floor(Number(k.t) / 1000),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
      volume: Number(k.v),
      isClosed: Boolean(k.x),
      receivedAt: Date.now(),
    };
    return isValidOhlcv(update) ? update : null;
  }

  private startWatchdog(generation: number): void {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (!this.isCurrent(generation) || !this.ws) return;
      const silentMs = Date.now() - this.progressAt;
      if (silentMs <= STALL_AFTER_MS) return;
      logMarketDataWarn('binance-futures-ws', {
        kind: 'stalled',
        silentMs,
        note: 'No valid kline received in time; closing and reconnecting.',
      });
      this.detachSocket();
      this.stopWatchdog();
      this.scheduleReconnect();
    }, WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
  }

  private scheduleReconnect(): void {
    if (!this.subscription) return;
    this.attempts += 1;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** (this.attempts - 1), RECONNECT_MAX_MS);
    this.setStatus('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private detachSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
  }

  private teardownSocket(): void {
    this.generation += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopWatchdog();
    this.detachSocket();
  }
}

export const futuresSocket = new BinanceFuturesSocket();
