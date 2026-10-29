import { useEffect, useRef, useState } from "react";
import { Mark } from "../ui/Logo";

/** A brief, skippable cover for each course in this tab; never blocks the page. */
export function CourseOpening({ courseId, profileId, enabled }: { courseId: string; profileId: string; enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const ownedKey = useRef<string | null>(null);
  useEffect(() => {
    setVisible(false);
    if (!enabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `word-atlas:course-opening:${profileId}:${courseId}`;
    try { if (sessionStorage.getItem(key) && ownedKey.current !== key) return; sessionStorage.setItem(key, "1"); ownedKey.current = key; } catch { return; }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [courseId, profileId, enabled]);
  if (!visible) return null;
  return <div className="course-opening" aria-label="学习旅程开场">
    <div className="course-opening-content" aria-hidden="true"><Mark size={52} /><span>词光 · {courseId === "hanzi-starter" ? "汉字启蒙" : "基础英语"}</span><small>一起打开今天的发现</small></div>
    <button type="button" className="course-opening-skip" onClick={() => setVisible(false)}>跳过开场</button>
  </div>;
}
