import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./diagnostics', () => ({
  logMarketDataError: vi.fn(),
  logMarketDataWarn: vi.fn(),
}));

import { BinanceFuturesSocket, type FuturesKlineUpdate, type FuturesSocketState } from './binanceFuturesSocket';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
    this.readyState = FakeWebSocket.CLOSED;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  send(frame: unknown) {
    this.onmessage?.({ data: typeof frame === 'string' ? frame : JSON.stringify(frame) });
  }
}

const kline = (overrides: Record<string, unknown> = {}) => ({
  e: 'kline',
  s: 'BTCUSDT',
  k: {
    t: 60_000,
    i: '1h',
    o: '100',
    h: '110',
    l: '90',
    c: '105',
    v: '5',
    x: false,
    ...overrides,
  },
});

describe('BinanceFuturesSocket', () => {
  let socket: BinanceFuturesSocket;
  let onUpdate: ReturnType<typeof vi.fn<(update: FuturesKlineUpdate) => void>>;
  let onResync: ReturnType<typeof vi.fn<() => void>>;
  let lastState: FuturesSocketState | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    socket = new BinanceFuturesSocket();
    socket.onState((state) => {
      lastState = state;
    });
    onUpdate = vi.fn<(update: FuturesKlineUpdate) => void>();
    onResync = vi.fn<() => void>();
  });

  afterEach(() => {
    socket.unsubscribe();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const subscribe = () => socket.subscribe('BTCUSDT', '1H', onUpdate, onResync);
  const current = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  const latest = () => lastState as FuturesSocketState;

  it('reconnects when the connection stalls while still connecting', async () => {
    subscribe();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    expect(FakeWebSocket.instances[0].closeCalls.length).toBeGreaterThan(0);
  });

  it('reconnects when the connection opens but no valid kline arrives', async () => {
    subscribe();
    current().open();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('reconnects without a close event after a stall and uses 1s then 2s backoff', async () => {
    subscribe();
    current().open();
    await vi.advanceTimersByTimeAsync(35_000);
    const afterStall = FakeWebSocket.instances.length;
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeWebSocket.instances.length).toBe(afterStall);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeWebSocket.instances.length).toBe(afterStall + 1);
  });

  it('resets backoff only after a valid kline is received', () => {
    subscribe();
    current().onclose?.({ code: 1006, reason: '', wasClean: false });
    expect(latest().attempts).toBe(1);
    vi.advanceTimersByTime(1000);
    current().open();
    expect(latest().attempts).toBe(1);
    current().send(kline());
    expect(latest().attempts).toBe(0);
    expect(latest().lastMessageAt).not.toBeNull();
  });

  it('ignores invalid frames and wrong symbol or interval', () => {
    subscribe();
    current().open();
    current().send('null');
    current().send('{not json');
    current().send(kline({ o: 'NaN' }));
    current().send(kline({ h: '50' }));
    current().send(kline({ i: '4h' }));
    current().send({ e: 'kline', s: 'ETHUSDT', k: kline().k });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(latest().lastMessageAt).toBeNull();
  });

  it('skips identical frames but emits price or volume changes on the same bar', () => {
    subscribe();
    current().open();
    current().send(kline());
    current().send(kline());
    expect(onUpdate).toHaveBeenCalledTimes(1);
    current().send(kline({ c: '106' }));
    current().send(kline({ v: '9' }));
    expect(onUpdate).toHaveBeenCalledTimes(3);
  });

  it('ignores callbacks from a socket that was replaced', () => {
    subscribe();
    const first = current();
    const staleMessage = first.onmessage;
    subscribe();
    staleMessage?.({ data: JSON.stringify(kline()) });
    first.onclose?.({ code: 1000, reason: '', wasClean: true });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(latest().status).toBe('connecting');
  });

  it('cancels pending reconnects after unsubscribe', async () => {
    subscribe();
    current().onclose?.({ code: 1006, reason: '', wasClean: false });
    const count = FakeWebSocket.instances.length;
    socket.unsubscribe();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances.length).toBe(count);
    expect(latest().status).toBe('idle');
  });

  it('clears last message time and close diagnostics on resubscribe', () => {
    subscribe();
    current().open();
    current().send(kline());
    current().onclose?.({ code: 1011, reason: 'boom', wasClean: false });
    subscribe();
    expect(latest()).toMatchObject({ lastMessageAt: null, lastCloseCode: null, lastCloseReason: null });
  });
});
