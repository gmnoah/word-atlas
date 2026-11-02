import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Minus, Plus, RotateCcw } from "lucide-react";
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
  const topicMarkers = useRef<SVGSVGElement>(null);
  const starStates = useRef<Float32Array>(new Float32Array());
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const multiTouch = useRef(false);
  const [topic, setTopic] = useState(lessons[0]?.id ?? "");
  const [focusedTopic, setFocusedTopic] = useState<string | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
  const hoveredEntry = hoveredId ? entryById.get(hoveredId) : undefined;
  const focusedIndices = focusedTopic === chosen?.id ? [...new Set(visible.map(entry => layout.index.get(entry.id)).filter((index): index is number => index !== undefined))] : [];

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const initialize = () => {
      let instance: GalaxyEngine;
      // Keep the map still until the learner moves it; avoid continuous twinkle
      // and rotation while preserving the existing 3D renderer and controls.
      try { instance = new GalaxyEngine(cv, layout, { quality: detectQuality(), reducedMotion: true, autoRotate: 0, preserve: true }); }
      catch { setWebgl(false); return; }
      engine.current = instance;
      setWebgl(instance.webgl);
      setContextLost(false);
      instance.resize();
      instance.onFrame = () => {
        const markers = topicMarkers.current;
        if (!markers) return;
        markers.querySelectorAll<SVGCircleElement>("circle[data-index]").forEach(circle => {
          const index = Number(circle.dataset.index), offset = index * 3;
          const point = instance.toScreen(layout.positions[offset], layout.positions[offset + 1], layout.positions[offset + 2]);
          if (!point) { circle.style.visibility = "hidden"; return; }
          circle.setAttribute("cx", String(point.x)); circle.setAttribute("cy", String(point.y)); circle.style.visibility = "visible";
        });
      };
      if (starStates.current.length === layout.n) instance.setStates(starStates.current);
      instance.drawOnce();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      engine.current?.destroy(); engine.current = null;
      pointers.current.clear(); drag.current = null; pinch.current = null;
      setHoveredId(null); setFocusedTopic(null); setContextLost(true); setWebgl(false);
    };
    const restored = () => { initialize(); };
    cv.addEventListener("webglcontextlost", lost);
    cv.addEventListener("webglcontextrestored", restored);
    initialize();
    const resize = new ResizeObserver(() => { engine.current?.resize(); engine.current?.drawOnce(); }); resize.observe(cv);
    return () => { resize.disconnect(); cv.removeEventListener("webglcontextlost", lost); cv.removeEventListener("webglcontextrestored", restored); engine.current?.destroy(); engine.current = null; };
  }, [layout]);
  useEffect(() => {
    const states = new Float32Array(layout.n);
    layout.ids.forEach((id, index) => { if (seen.has(id)) states[index] = 1; });
    starStates.current = states;
    engine.current?.setStates(states);
    engine.current?.drawOnce();
  }, [layout, seen]);
  useEffect(() => { engine.current?.drawOnce(); }, [focusedTopic]);
  const zoom = (factor: number) => { if (engine.current) { engine.current.cancelCameraMotion(); engine.current.cam.dist = Math.max(0.35, Math.min(4.2, engine.current.cam.dist * factor)); engine.current.drawOnce(); } };
  const focusTopic = () => {
    const indices = visible.map(entry => layout.index.get(entry.id)).filter((index): index is number => index !== undefined);
    if (indices.length && engine.current) { engine.current.frameStars(indices); engine.current.drawOnce(); setFocusedTopic(chosen?.id ?? null); }
  };
  return <section className="course-galaxy" aria-label="课程知识星图">
    <div className="course-galaxy-sky">
      <canvas ref={canvas} role="img" tabIndex={webgl ? 0 : -1} aria-label={`知识星图，共 ${entries.length} 个${courseId === "hanzi-starter" ? "字" : "词"}，${progress.ok ? `看过 ${seen.size} 个` : "学习记录暂不可读取"}。${webgl ? "可拖动或用方向键旋转，用加减键缩放；" : ""}下面可按主题选择词卡。`}
        onKeyDown={event => {
          const view = engine.current;
          if (!view || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(event.key)) return;
          event.preventDefault();
          view.cancelCameraMotion();
          if (event.key === "ArrowLeft") view.cam.yaw -= .12;
          if (event.key === "ArrowRight") view.cam.yaw += .12;
          if (event.key === "ArrowUp") view.cam.pitch = Math.min(1.45, view.cam.pitch + .08);
          if (event.key === "ArrowDown") view.cam.pitch = Math.max(.12, view.cam.pitch - .08);
          if (event.key === "+" || event.key === "=") zoom(.8);
          if (event.key === "-") zoom(1.25);
          view.drawOnce();
        }}
        onPointerDown={event => {
          if (!webgl) return;
          setHoveredId(null);
          if (engine.current) engine.current.hover = -1;
          engine.current?.drawOnce();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size === 1) { drag.current = { x: event.clientX, y: event.clientY, moved: 0 }; multiTouch.current = false; }
          else { multiTouch.current = true; const [a,b] = [...pointers.current.values()]; pinch.current = Math.hypot(a.x-b.x,a.y-b.y); }
        }}
        onPointerMove={event => {
          if (!pointers.current.has(event.pointerId)) {
            if (webgl && event.pointerType === "mouse" && engine.current) {
              const rect = event.currentTarget.getBoundingClientRect();
              const index = engine.current.pick(event.clientX - rect.left, event.clientY - rect.top, 22);
              engine.current.hover = index;
              engine.current.drawOnce();
              setHoveredId(entries[index]?.id ?? null);
            }
            return;
          }
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const view = engine.current;
          if (!view) return;
          view.cancelCameraMotion();
          if (pointers.current.size >= 2) { const [a,b] = [...pointers.current.values()]; const distance = Math.hypot(a.x-b.x,a.y-b.y); if (pinch.current && distance > 0) zoom(pinch.current / distance); pinch.current = distance; return; }
          const d = drag.current;
          if (!d || multiTouch.current) return;
          const dx=event.clientX-d.x, dy=event.clientY-d.y; d.moved+=Math.abs(dx)+Math.abs(dy); d.x=event.clientX; d.y=event.clientY; view.cam.yaw-=dx*.006; view.cam.pitch=Math.max(.12,Math.min(1.45,view.cam.pitch+dy*.005)); view.drawOnce();
        }}
        onPointerUp={event => {
          pointers.current.delete(event.pointerId);
          const d=drag.current;
          if (pointers.current.size) return;
          drag.current=null; pinch.current=null;
          if (multiTouch.current || !d || d.moved>8 || !engine.current) return;
          const rect=event.currentTarget.getBoundingClientRect(); const index=engine.current.pick(event.clientX-rect.left,event.clientY-rect.top,22); const entry=entries[index]; if (entry) onOpen(entry);
        }}
        onPointerCancel={event => { pointers.current.delete(event.pointerId); drag.current=null; pinch.current=null; multiTouch.current=true; }}
        onPointerLeave={() => { if (engine.current) { engine.current.hover = -1; engine.current.drawOnce(); } setHoveredId(null); }} />
      <svg ref={topicMarkers} className="course-galaxy-markers" aria-hidden="true">{focusedIndices.map(index => <circle key={index} data-index={index} r="8" />)}</svg>
      <div className="course-galaxy-caption"><strong>你的知识星图</strong><span>{progress.ok ? `看过 ${seen.size} / ${entries.length}` : "学习记录暂时无法读取"}</span></div>
      {hoveredEntry && <div className="course-galaxy-preview" aria-hidden="true"><strong lang={hoveredEntry.kind === "hanzi" ? "zh-CN" : "en"}>{entryLabel(hoveredEntry)}</strong><span>{hoveredEntry.kind === "hanzi" ? hoveredEntry.phrase : hoveredEntry.meaning}</span>{progress.ok && seen.has(hoveredEntry.id) && <small>看过</small>}</div>}
      {webgl && <div className="course-galaxy-controls"><button type="button" onClick={() => zoom(.8)} aria-label="放大星图"><Plus size={18} /></button><button type="button" onClick={() => zoom(1.25)} aria-label="缩小星图"><Minus size={18} /></button><button type="button" onClick={() => { setFocusedTopic(null); engine.current?.resetImmediately(); engine.current?.drawOnce(); }} aria-label="重置星图"><RotateCcw size={18} /></button></div>}
    </div>
    <p role={contextLost ? "status" : undefined}>{webgl ? "拖动或用方向键旋转，双指或加减键缩放；点亮代表看过，圆圈标示定位的主题。也可以从下面的主题打开词卡。" : contextLost ? "星图画面暂时中断，可以继续从下面的主题打开词卡。" : "此设备暂不支持三维画面，可以从下面的主题打开词卡。"}看过不代表掌握。</p>
    <div className="course-galaxy-filter"><label htmlFor="course-galaxy-topic">选择主题</label><select id="course-galaxy-topic" value={chosen?.id ?? ""} onChange={event => { setTopic(event.target.value); setFocusedTopic(null); }}>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select>
      {webgl && <button type="button" className="btn btn-ghost" disabled={!visible.length} onClick={focusTopic} aria-label={`在星图中定位${chosen?.title ?? "当前主题"}`}><Crosshair size={17} /> 定位主题</button>}
    </div>
    <ul className="course-galaxy-entries">{visible.map(entry => <li key={entry.id}><button type="button" onClick={() => onOpen(entry)} aria-label={`查看${entryLabel(entry)}${entry.kind === "hanzi" ? "字卡" : "词卡"}${seen.has(entry.id) ? "，看过" : ""}`}><span lang={entry.kind === "hanzi" ? "zh-CN" : "en"}>{entryLabel(entry)}</span>{seen.has(entry.id) && <small>看过</small>}</button></li>)}</ul>
  </section>;
}
