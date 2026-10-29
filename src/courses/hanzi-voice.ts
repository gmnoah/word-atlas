/** Detect a Mandarin device voice without pretending a recording exists. */
export interface SpeechScope {
  speechSynthesis?: SpeechSynthesis;
}

/** Avoid selecting Cantonese or a different regional voice for Mandarin lessons. */
export function findMandarinVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find((voice) => {
    const lang = voice.lang.replaceAll("_", "-").toLowerCase();
    return lang === "zh-cn" || lang === "zh-hans" || lang.startsWith("zh-hans-");
  });
}

export function hasMandarinVoice(scope?: SpeechScope): boolean {
  if (!scope?.speechSynthesis) return false;
  try {
    const voices = scope.speechSynthesis.getVoices();
    return !!findMandarinVoice(voices);
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
