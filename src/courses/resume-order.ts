/** The raw checkpoint is inspected only after the full checkpoint validator accepts it. */
export function checkpointSavedAt(raw: string, startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || startedAt < 0 || startedAt > now) return 0;
  const fallback = startedAt;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("session" in parsed)) return fallback;
    const session = (parsed as { session?: unknown }).session;
    if (!session || typeof session !== "object" || !("lastTickAt" in session)) return fallback;
    const value = (session as { lastTickAt?: unknown }).lastTickAt;
    return typeof value === "number" && Number.isFinite(value) && value >= fallback && value <= now ? value : fallback;
  } catch { return fallback; }
}
