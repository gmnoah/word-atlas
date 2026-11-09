import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { findMandarinVoice } from "./hanzi-voice";

let activeStop: (() => void) | null = null;

export function PreviewSpeak({
  text,
  locale,
  recording,
  slow = false,
  accessibleLabel,
  onPlaybackState,
  idleLabel = "听一听",
  className = "preview-voice",
}: {
  text: string;
  locale: "en-GB" | "zh-CN";
  recording: string | null;
  slow?: boolean;
  accessibleLabel?: string;
  onPlaybackState?: (state: "waiting" | "playing" | "ready" | "error") => void;
  idleLabel?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "playing" | "error">("idle");
  const active = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopSelf = () => {
    generation.current++;
    clearTimeout(timer.current);
    active.current?.pause();
    active.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (activeStop === stopAndReset) activeStop = null;
  };
  const stopAndReset = () => {
    stopSelf();
    setStatus("idle");
    onPlaybackState?.("waiting");
  };
  useEffect(() => () => stopSelf(), []);

  const speak = async () => {
    const wasPlaying = status === "playing";
    if (activeStop && activeStop !== stopAndReset) {
      activeStop();
    }
    stopSelf();
    if (wasPlaying) {
      setStatus("idle");
      onPlaybackState?.("waiting");
      return;
    }
    const mine = generation.current;
    activeStop = stopAndReset;
    setStatus("playing");
    onPlaybackState?.("playing");
    const finish = (error = false) => {
      if (mine !== generation.current) return;
      stopSelf();
      setStatus(error ? "error" : "idle");
      onPlaybackState?.(error ? "error" : "ready");
    };
    timer.current = setTimeout(() => finish(true), 15000);
    try {
      if (recording) {
        const audioUrl =
          recording.startsWith("http") || recording.startsWith("/")
            ? recording
            : `${import.meta.env.BASE_URL}${recording}`;
        const audio = new Audio(audioUrl);
        active.current = audio;
        audio.playbackRate = slow ? 0.8 : 1;
        audio.onended = () => finish();
        audio.onerror = () => finish(true);
        await audio.play();
        return;
      }
      if (!("speechSynthesis" in window)) { finish(true); return; }
      const voices = window.speechSynthesis.getVoices();
      const voice = locale === "zh-CN" ? findMandarinVoice(voices) : voices.find((v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase());
      if (locale === "zh-CN" && !voice) { finish(true); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      if (voice) utterance.voice = voice;
      utterance.rate = slow ? 0.7 : 0.9;
      utterance.onend = () => finish();
      utterance.onerror = () => finish(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      finish(true);
    }
  };
  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void speak()}
        aria-label={status === "playing" ? "停止朗读" : accessibleLabel ?? `朗读 ${text}`}
      >
        <Volume2 size={20} />
        {status === "playing" ? "停止朗读" : idleLabel}
      </button>
      {status === "error" && (
        <p role="status">暂时无法播放，可以重试，也可以请家长读一读。</p>
      )}
    </div>
  );
}
