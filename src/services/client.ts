// Thin mock transport. Swap these helpers for fetch() calls when a real API exists.

const LATENCY_MS = 150

export function respond<T>(data: T, latency = LATENCY_MS): Promise<T> {
  // structuredClone so callers can never mutate the mock "database".
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), latency))
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the demo keeps working in memory for this session.
  }
}
