/** Prevent stale, failed or unfinished speech from unlocking a listening question. */
export type ListenStatus = "idle" | "playing" | "ready" | "failed";

export function createListenGate(update: (status: ListenStatus) => void, timeoutMs = 12_000) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  return {
    start(play: (complete: () => void, fail: () => void) => void) {
      clear();
      const current = ++generation;
      let settled = false;
      const finish = (status: "ready" | "failed") => {
        if (settled || current !== generation) return;
        settled = true;
        clear();
        update(status);
      };
      update("playing");
      timer = setTimeout(() => finish("failed"), timeoutMs);
      try { play(() => finish("ready"), () => finish("failed")); }
      catch { finish("failed"); }
    },
    reset() { generation++; clear(); update("idle"); },
    dispose() { generation++; clear(); },
  };
}
