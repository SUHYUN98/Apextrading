export type Row = Record<string, unknown>;

export function asRecord(value: unknown): Row {
  return value && typeof value === 'object' ? (value as Row) : {};
}

export function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Unexpected ${label} response shape`);
  return value;
}

export async function fetchJson(url: string): Promise<unknown> {
  const path = new URL(url).pathname;
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error(`Network request failed for ${path}`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
  return response.json();
}

export function parseJsonRecord(text: string): Row {
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return {};
  }
}

export function spreadPercent(bid: number, ask: number): number | null {
  if (!(bid > 0) || !(ask > 0) || ask < bid) return null;
  return ((ask - bid) / ((ask + bid) / 2)) * 100;
}
