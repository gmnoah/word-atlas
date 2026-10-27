import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PreviewSpeak({
  text,
  locale,
  recording,
  slow = false,
}: {
  text: string;
  locale: "en-GB" | "zh-CN";
  recording: string | null;
  slow?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "playing" | "error">("idle");
  const active = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => {
    generation.current++;
    clearTimeout(timer.current);
    active.current?.pause();
    active.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };
  useEffect(() => () => cancel(), []);

  const speak = async () => {
    const wasPlaying = status === "playing";
    cancel();
    if (wasPlaying) {
      setStatus("idle");
      return;
    }
    const mine = generation.current;
    setStatus("playing");
    const finish = (error = false) => {
      if (mine !== generation.current) return;
      cancel();
      setStatus(error ? "error" : "idle");
    };
    timer.current = setTimeout(() => finish(true), 15000);
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
      try {
        await audio.play();
      } catch {
        finish(true);
      }
      return;
    }
    if (!("speechSynthesis" in window)) {
      finish(true);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.replace("_", "-") === locale);
    if (locale === "zh-CN" && !voice) {
      finish(true);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    if (voice) utterance.voice = voice;
    utterance.rate = slow ? 0.7 : 0.9;
    utterance.onend = () => finish();
    utterance.onerror = () => finish(true);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish(true);
    }
  };
  return (
    <div className="preview-voice">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void speak()}
        aria-label={status === "playing" ? "停止朗读" : `朗读 ${text}`}
      >
        <Volume2 size={20} />
        {status === "playing" ? "停止朗读" : "听一听"}
      </button>
      {status === "error" && (
        <p role="status">暂时无法播放，可以重试，也可以请家长读一读。</p>
      )}
    </div>
  );
}
