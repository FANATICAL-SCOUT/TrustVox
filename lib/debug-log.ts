function debugLog(prefix: string, step: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  if (payload) {
    console.debug(`[${prefix}] ${step}`, payload);
  } else {
    console.debug(`[${prefix}] ${step}`);
  }
}

export function logFlow(step: string, payload?: Record<string, unknown>) {
  debugLog("TrustVoxFlow", step, payload);
}

export function logStore(step: string, payload?: Record<string, unknown>) {
  debugLog("TrustVoxAdmin", step, payload);
}
