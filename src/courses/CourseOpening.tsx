import { useEffect, useRef, useState } from "react";
import { Mark } from "../ui/Logo";

/** A brief, skippable cover for each course in this tab; never blocks the page. */
export function CourseOpening({ courseId, profileId, enabled }: { courseId: string; profileId: string; enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const ownedKey = useRef<string | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const dismiss = () => {
    const skip = skipRef.current;
    if (skip && document.activeElement === skip) {
      skip.closest(".journey")?.querySelector<HTMLButtonElement>(".journey-actions button:not(:disabled)")?.focus();
    }
    setVisible(false);
  };
  useEffect(() => {
    setVisible(false);
    if (!enabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `word-atlas:course-opening:${profileId}:${courseId}`;
    try { if (sessionStorage.getItem(key) && ownedKey.current !== key) return; sessionStorage.setItem(key, "1"); ownedKey.current = key; } catch { return; }
    setVisible(true);
    const timer = window.setTimeout(dismiss, 1800);
    return () => window.clearTimeout(timer);
  }, [courseId, profileId, enabled]);
  if (!visible) return null;
  const hanzi = courseId === "hanzi-starter";
  return <div className={`course-opening is-${hanzi ? "hanzi" : "english"}`} role="region" aria-label="学习旅程开场">
    <div className="course-opening-stars" aria-hidden="true"><i /><i /><i /></div>
    <div className="course-opening-card" aria-hidden="true">
      <div className="course-opening-orbit">
        <i className="course-opening-node is-one" />
        <i className="course-opening-node is-two" />
        <i className="course-opening-node is-three" />
        <span className="course-opening-emblem"><Mark size={52} /></span>
      </div>
      <p className="course-opening-kicker">
        {hanzi ? "FIRST CHARACTERS / 亲子探索" : "LITTLE EXPLORERS / 今日探索"}
      </p>
      <strong>词光 · {hanzi ? "汉字启蒙" : "基础英语"}</strong>
      <p className="course-opening-guide">
        {hanzi ? "看一看 · 听一听 · 找一找" : "LOOK · LISTEN · REMEMBER"}
      </p>
      <small>一起打开今天的发现</small>
    </div>
    <div className="course-opening-track" aria-hidden="true"><span /></div>
    <button ref={skipRef} type="button" className="course-opening-skip" onClick={dismiss}>跳过开场</button>
  </div>;
}
