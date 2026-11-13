const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30000;

interface ReconnectingSocketOptions {
  url: string;
  onOpen?: (socket: WebSocket) => void;
  onMessage: (data: string) => void;
  onError: (message: string) => void;
  heartbeat?: { intervalMs: number; payload: string };
}

export function openReconnectingSocket(options: ReconnectingSocketOptions): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let attempt = 0;
  let closedByCaller = false;

  const connect = () => {
    const current = new WebSocket(options.url);
    socket = current;

    current.onopen = () => {
      attempt = 0;
      options.onOpen?.(current);
      const heartbeat = options.heartbeat;
      if (heartbeat) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (current.readyState === WebSocket.OPEN) current.send(heartbeat.payload);
        }, heartbeat.intervalMs);
      }
    };

    current.onmessage = (event) => {
      if (typeof event.data === 'string') options.onMessage(event.data);
    };

    current.onclose = () => {
      clearInterval(heartbeatTimer);
      if (closedByCaller) return;
      attempt++;
      options.onError(`Live feed disconnected, reconnecting (attempt ${attempt})`);
      retryTimer = setTimeout(connect, Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS));
    };
  };

  connect();

  return () => {
    closedByCaller = true;
    clearTimeout(retryTimer);
    clearInterval(heartbeatTimer);
    socket?.close();
  };
}
