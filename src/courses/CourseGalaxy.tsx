import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { detectQuality, GalaxyEngine } from "../galaxy/engine";
import { layoutGalaxy } from "../galaxy/layout";
import { readPrimaryProgress } from "../learning/primary-progress";
import { entryLabel, type LearningEntry, type Lesson } from "./types";

/** Course-scoped knowledge map. A star means seen, not mastered. */
export default function CourseGalaxy({ entries, lessons, profileId, courseId, revision, onOpen }: {
  entries: LearningEntry[]; lessons: Lesson[]; profileId: string; courseId: string; revision: number; onOpen: (entry: LearningEntry) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<GalaxyEngine | null>(null);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const multiTouch = useRef(false);
  const [topic, setTopic] = useState(lessons[0]?.id ?? "");
  const [webgl, setWebgl] = useState(true);
  const entryById = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries]);
  const layout = useMemo(() => {
    const topicByEntry = new Map<string, number>();
    lessons.forEach((lesson, index) => lesson.entryIds.forEach(id => { if (!topicByEntry.has(id)) topicByEntry.set(id, index); }));
    return layoutGalaxy({ topics: (lessons.length ? lessons : [{ id: "all", title: "全部" }]).map(item => [item.id, item.title]), words: entries.map((entry, order) => ({ id: entry.id, word: entryLabel(entry), zh: "", ipa: "", cefr: 2, topic: topicByEntry.get(entry.id) ?? 0, media: 0, order })) });
  }, [entries, lessons]);
  const progress = useMemo(() => { void revision; return readPrimaryProgress(localStorage, profileId, courseId); }, [profileId, courseId, revision]);
  const seen = useMemo(() => new Set(progress.ok ? Object.keys(progress.progress.introduced).filter(id => entryById.has(id)) : []), [progress, entryById]);
  const chosen = lessons.find(item => item.id === topic) ?? lessons[0];
  const visible = chosen ? chosen.entryIds.map(id => entryById.get(id)).filter((entry): entry is LearningEntry => !!entry) : entries;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let instance: GalaxyEngine;
    // Keep the map still until the learner moves it; avoid continuous twinkle
    // and rotation while preserving the existing 3D renderer and controls.
    try { instance = new GalaxyEngine(cv, layout, { quality: detectQuality(), reducedMotion: true, autoRotate: 0 }); }
    catch { setWebgl(false); return; }
    engine.current = instance;
    setWebgl(instance.webgl);
    instance.resize();
    const resize = new ResizeObserver(() => instance.resize()); resize.observe(cv);
    const visibility = new IntersectionObserver(([item]) => item.isIntersecting && !document.hidden ? instance.start() : instance.stop()); visibility.observe(cv);
    const onVisibility = () => document.hidden ? instance.stop() : instance.start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { resize.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", onVisibility); instance.destroy(); engine.current = null; };
  }, [layout]);
  useEffect(() => {
    const states = new Float32Array(layout.n);
    layout.ids.forEach((id, index) => { if (seen.has(id)) states[index] = 1; });
    engine.current?.setStates(states);
  }, [layout, seen]);
  const zoom = (factor: number) => { if (engine.current) engine.current.cam.dist = Math.max(0.35, Math.min(4.2, engine.current.cam.dist * factor)); };
  return <section className="course-galaxy" aria-label="课程知识星图">
    <div className="course-galaxy-sky">
      <canvas ref={canvas} role="img" aria-label={`知识星图，共 ${entries.length} 个${courseId === "hanzi-starter" ? "字" : "词"}，${progress.ok ? `看过 ${seen.size} 个` : "学习记录暂不可读取"}。可拖动旋转，下面可按主题选择词卡。`}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size === 1) { drag.current = { x: event.clientX, y: event.clientY, moved: 0 }; multiTouch.current = false; }
          else { multiTouch.current = true; const [a,b] = [...pointers.current.values()]; pinch.current = Math.hypot(a.x-b.x,a.y-b.y); }
        }}
        onPointerMove={event => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const view = engine.current;
          if (!view) return;
          if (pointers.current.size >= 2) { const [a,b] = [...pointers.current.values()]; const distance = Math.hypot(a.x-b.x,a.y-b.y); if (pinch.current && distance > 0) zoom(pinch.current / distance); pinch.current = distance; return; }
          const d = drag.current;
          if (!d || multiTouch.current) return;
          const dx=event.clientX-d.x, dy=event.clientY-d.y; d.moved+=Math.abs(dx)+Math.abs(dy); d.x=event.clientX; d.y=event.clientY; view.cam.yaw-=dx*.006; view.cam.pitch=Math.max(.12,Math.min(1.45,view.cam.pitch+dy*.005));
        }}
        onPointerUp={event => {
          pointers.current.delete(event.pointerId);
          const d=drag.current;
          if (pointers.current.size) return;
          drag.current=null; pinch.current=null;
          if (multiTouch.current || !d || d.moved>8 || !engine.current) return;
          const rect=event.currentTarget.getBoundingClientRect(); const index=engine.current.pick(event.clientX-rect.left,event.clientY-rect.top,22); const entry=entries[index]; if (entry) onOpen(entry);
        }}
        onPointerCancel={event => { pointers.current.delete(event.pointerId); drag.current=null; pinch.current=null; multiTouch.current=true; }} />
      <div className="course-galaxy-caption"><strong>你的知识星图</strong><span>{progress.ok ? `看过 ${seen.size} / ${entries.length}` : "学习记录暂时无法读取"}</span></div>
      <div className="course-galaxy-controls"><button type="button" onClick={() => zoom(.8)} aria-label="放大星图"><Plus size={18} /></button><button type="button" onClick={() => zoom(1.25)} aria-label="缩小星图"><Minus size={18} /></button><button type="button" onClick={() => engine.current?.reset()} aria-label="重置星图"><RotateCcw size={18} /></button></div>
    </div>
    <p>{webgl ? "拖动旋转，双指缩放，点亮代表看过；也可以从下面的主题打开词卡。" : "此设备暂不支持三维画面，可以从下面的主题打开词卡。"}看过不代表掌握。</p>
    <label className="course-galaxy-filter">选择主题 <select value={chosen?.id ?? ""} onChange={event => setTopic(event.target.value)}>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
    <ul className="course-galaxy-entries">{visible.map(entry => <li key={entry.id}><button type="button" onClick={() => onOpen(entry)} aria-label={`查看${entryLabel(entry)}${entry.kind === "hanzi" ? "字卡" : "词卡"}${seen.has(entry.id) ? "，看过" : ""}`}><span lang={entry.kind === "hanzi" ? "zh-CN" : "en"}>{entryLabel(entry)}</span>{seen.has(entry.id) && <small>看过</small>}</button></li>)}</ul>
  </section>;
}
