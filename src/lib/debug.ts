type DebugContext = Readonly<Record<string, boolean | number | string | undefined>>;

export function debugLog(event: string, context: DebugContext = {}): void {
  console.debug("[DiveBridge]", event, context);
}
