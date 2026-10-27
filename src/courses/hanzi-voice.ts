/** Detect a Mandarin device voice without pretending a recording exists. */
export interface SpeechScope {
  speechSynthesis?: SpeechSynthesis;
}

export function hasMandarinVoice(scope?: SpeechScope): boolean {
  if (!scope?.speechSynthesis) return false;
  try {
    const voices = scope.speechSynthesis.getVoices();
    return voices.some((voice) =>
      voice.lang.replace("_", "-").toLowerCase().startsWith("zh"),
    );
  } catch {
    return false;
  }
}

/** Subscribe to late voice loading; some browsers populate voices asynchronously. */
export function watchMandarinVoice(
  scope: SpeechScope | undefined,
  update: (available: boolean) => void,
): () => void {
  if (!scope?.speechSynthesis) {
    update(false);
    return () => undefined;
  }
  const synth = scope.speechSynthesis;
  const refresh = () => update(hasMandarinVoice(scope));
  refresh();
  synth.addEventListener?.("voiceschanged", refresh);
  return () => synth.removeEventListener?.("voiceschanged", refresh);
}
