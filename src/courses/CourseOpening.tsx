import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { duck, playFile, preloadFiles } from "../lib/sound";
import { store } from "../store/store";
import { Mark } from "../ui/Logo";

let forcedCourseId: string | null = null;

/** Mark a course so its grand full-screen opening ceremony plays on the next transition from #/explore. */
export function triggerCourseOpening(courseId: string, profileId?: string) {
  forcedCourseId = courseId;
  if (profileId) {
    try {
      sessionStorage.removeItem(`word-atlas:course-opening:${profileId}:${courseId}`);
    } catch {
      /* optional */
    }
  }
}

export function consumeForcedCourseOpening(courseId: string): boolean {
  if (forcedCourseId === courseId) {
    forcedCourseId = null;
    return true;
  }
  return false;
}

interface Particle {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  c: string;
  r: number;
  d: number;
  a: number;
  tw: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function coursePalette(courseId: string): [string, number][] {
  if (courseId === "middle-english") {
    return [
      ["243,236,223", 0.54],
      ["143,178,204", 0.22],
      ["230,180,87", 0.14],
      ["151,184,142", 0.06],
      ["229,124,90", 0.04],
    ];
  }
  if (courseId === "hanzi-starter") {
    return [
      ["243,236,223", 0.54],
      ["229,124,90", 0.22],
      ["230,180,87", 0.15],
      ["151,184,142", 0.05],
      ["143,178,204", 0.04],
    ];
  }
  return [
    ["243,236,223", 0.54],
    ["151,184,142", 0.22],
    ["230,180,87", 0.14],
    ["143,178,204", 0.06],
    ["229,124,90", 0.04],
  ];
}

/**
 * Sample bright pixels of the course emblem, Chinese name, and English wordmark
 * at full-screen proportions matching IELTS Splash.tsx.
 */
function sampleCourseTargets(w: number, h: number, count: number, courseId: string) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return { pts: [] as [number, number][], wordTop: h * 0.5 };

  const s = Math.min(w, h);
  const cx = w / 2;
  const top = h * 0.46 - s * 0.3;
  const R = s * 0.082;
  const cy = top + R;

  g.fillStyle = g.strokeStyle = "#fff";
  g.lineWidth = Math.max(2, s * 0.006);

  if (courseId === "hanzi-starter") {
    const box = R * 1.68;
    g.strokeRect(cx - box / 2, cy - box / 2, box, box);
    g.beginPath();
    g.moveTo(cx - box / 2, cy);
    g.lineTo(cx + box / 2, cy);
    g.moveTo(cx, cy - box / 2);
    g.lineTo(cx, cy + box / 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, R * 0.32, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    if (courseId === "middle-english") {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.28);
      g.beginPath();
      g.ellipse(0, 0, R * 1.38, R * 0.46, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
    g.beginPath();
    g.moveTo(cx, cy - R * 0.9);
    g.lineTo(cx + R * 0.3, cy);
    g.lineTo(cx, cy + R * 0.9);
    g.lineTo(cx - R * 0.3, cy);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(cx - R * 0.62, cy);
    g.lineTo(cx, cy - R * 0.1);
    g.lineTo(cx + R * 0.62, cy);
    g.lineTo(cx, cy + R * 0.1);
    g.closePath();
    g.fill();
  }

  const zhTitle =
    courseId === "hanzi-starter"
      ? "汉字启蒙"
      : courseId === "middle-english"
        ? "初中英语"
        : "基础英语";
  const enSub =
    courseId === "hanzi-starter"
      ? "FIRST CHARACTERS"
      : courseId === "middle-english"
        ? "MIDDLE HORIZONS"
        : "LITTLE EXPLORERS";

  const zh = Math.min(w * 0.22, s * 0.19);
  g.font = `700 ${zh}px "Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(zhTitle, cx, cy + R + zh * 0.78);

  const en = Math.max(15, zh * 0.22);
  g.font = `700 ${en}px "Fraunces Variable", Georgia, serif`;
  g.letterSpacing = `${en * 0.28}px`;
  g.fillText(enSub, cx, cy + R + zh * 1.48);

  const data = g.getImageData(0, 0, w, h).data;
  const all: [number, number][] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 120) all.push([x, y]);
    }
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < count && all.length; i++) {
    const [x, y] = all[Math.floor(Math.random() * all.length)];
    pts.push([x + Math.random() * 2, y + Math.random() * 2]);
  }
  return { pts, wordTop: cy + R + zh * 1.3 };
}

/**
 * Full-screen IELTS-grade 3D double-door & 5,200-particle swirling stardust portal rendered into document.body.
 * Escapes any parent `.page` or `.journey` CSS transform/overflow clipping so it always fills 100vw x 100vh.
 */
export function CourseOpening({ courseId, profileId, enabled }: { courseId: string; profileId: string; enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"gather" | "ready" | "open">("gather");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openingRef = useRef(false);
  const ownedKey = useRef<string | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const dismiss = () => {
    const skip = skipRef.current;
    if (skip && document.activeElement === skip) {
      document.querySelector<HTMLButtonElement>(".journey-actions button:not(:disabled)")?.focus();
    }
    setVisible(false);
  };

  const triggerDoorOpen = (withSound = true) => {
    if (openingRef.current) return;
    openingRef.current = true;
    setPhase("open");
    if (withSound && store.get().settings.sfx) {
      void playFile("splash-burst.mp3", 0.55);
      void playFile("splash-door.mp3", 0.6, 0.12);
      duck(true);
      window.setTimeout(() => duck(false), 2200);
    }
  };

  useEffect(() => {
    setVisible(false);
    setPhase("gather");
    openingRef.current = false;
    const forced = consumeForcedCourseOpening(courseId);
    if (!enabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `word-atlas:course-opening:${profileId}:${courseId}`;
    if (!forced) {
      try {
        if (sessionStorage.getItem(key) && ownedKey.current !== key) return;
        sessionStorage.setItem(key, "1");
        ownedKey.current = key;
      } catch {
        return;
      }
    } else {
      try {
        sessionStorage.setItem(key, "1");
        ownedKey.current = key;
      } catch {
        /* optional */
      }
    }
    preloadFiles(["splash-door.mp3", "splash-burst.mp3"]);
    setVisible(true);
    const readyTimer = window.setTimeout(() => {
      setPhase((p) => (p === "gather" ? "ready" : p));
    }, 750);
    const openTimer = window.setTimeout(() => {
      triggerDoorOpen(forced);
    }, 1450);
    const doneTimer = window.setTimeout(dismiss, 2550);
    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, [courseId, profileId, enabled]);

  useEffect(() => {
    if (!visible) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(480, window.innerHeight);
    cv.width = w * dpr;
    cv.height = h * dpr;
    const g = cv.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);

    const N = w < 700 ? 2600 : 5200;
    const { pts, wordTop } = sampleCourseTargets(w, h, N, courseId);
    const palette = coursePalette(courseId);
    const pickColor = (): string => {
      let r = Math.random();
      for (const [c, p] of palette) if ((r -= p) <= 0) return c;
      return palette[0][0];
    };

    const cx = w / 2;
    const cy = h / 2;
    const ps: Particle[] = [];
    for (let i = 0; i < N; i++) {
      const [tx, ty] = pts.length ? pts[i % pts.length] : [cx, cy];
      const sx = -0.1 * w + Math.random() * 1.2 * w;
      const sy = -0.1 * h + Math.random() * 1.2 * h;
      ps.push({
        x: sx,
        y: sy,
        sx,
        sy,
        tx: tx + (Math.random() - 0.5) * 1.2,
        ty: ty + (Math.random() - 0.5) * 1.2,
        vx: 0,
        vy: 0,
        c: pickColor(),
        r: ty < wordTop && Math.random() < 0.06 ? 2.2 + Math.random() * 1.4 : 0.7 + Math.random() * 1.2,
        d: Math.random() * 0.45,
        a: 0.55 + Math.random() * 0.45,
        tw: Math.random() * Math.PI * 2,
      });
    }

    const stars = Array.from({ length: Math.round((w * h) / 9000) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 0.9 + 0.2,
      tw: Math.random() * 6,
    }));

    let raf = 0;
    const t0 = performance.now();
    let openAt = 0;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";

      for (const s of stars) {
        g.fillStyle = `rgba(243,236,223,${0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.tw))})`;
        g.fillRect(s.x, s.y, s.r, s.r);
      }

      if (openingRef.current && !openAt) {
        openAt = t;
        for (const p of ps) {
          const dx = p.x - cx;
          const dy = p.y - cy * 0.95;
          const len = Math.hypot(dx, dy) || 1;
          const sp = 4 + Math.random() * 9;
          p.vx = (dx / len) * sp + (Math.random() - 0.5) * 3;
          p.vy = (dy / len) * sp + (Math.random() - 0.5) * 3 - 1;
        }
      }

      const fade = openAt ? Math.max(0, 1 - (t - openAt) / 1.05) : 1;
      for (const p of ps) {
        if (openAt) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.985;
          p.vy = p.vy * 0.985 + 0.04;
        } else {
          const k = easeOutCubic((t - 0.1 - p.d) / 1.2);
          const sw = (1 - k) * (90 + p.tw * 12);
          const ang = (1 - k) * 3.2 + p.tw;
          p.x = p.sx + (p.tx - p.sx) * k + Math.cos(ang) * sw;
          p.y = p.sy + (p.ty - p.sy) * k + Math.sin(ang) * sw;
          if (k >= 1) {
            p.x += Math.sin(t * 2 + p.tw) * 0.35;
            p.y += Math.cos(t * 1.7 + p.tw) * 0.35;
          }
        }
        const twinkle = 0.75 + 0.25 * Math.sin(t * 3 + p.tw * 3);
        const alpha = p.a * twinkle * fade;
        if (p.r > 2) {
          g.fillStyle = `rgba(${p.c},${alpha * 0.12})`;
          g.beginPath();
          g.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = `rgba(${p.c},${alpha})`;
        g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }

      g.globalCompositeOperation = "source-over";
      if (!openAt || t - openAt < 1.2) {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [visible, courseId]);

  if (!visible) return null;
  const hanzi = courseId === "hanzi-starter";
  const middle = courseId === "middle-english";
  const stageClass = hanzi ? "hanzi" : middle ? "middle" : "primary";

  const overlay = (
    <div
      className={`course-opening is-${hanzi ? "hanzi" : "english"} is-stage-${stageClass} is-${phase}`}
      role="region"
      aria-label="学习旅程开场"
    >
      <div className="course-opening-door is-left" aria-hidden="true" />
      <div className="course-opening-door is-right" aria-hidden="true" />
      <div className="course-opening-light" aria-hidden="true" />
      <canvas ref={canvasRef} className="course-opening-canvas" aria-hidden="true" />
      <div className="course-opening-stars" aria-hidden="true"><i /><i /><i /></div>
      <div className="course-opening-card" aria-hidden="true">
        <div className="course-opening-orbit">
          <i className="course-opening-node is-one" />
          <i className="course-opening-node is-two" />
          <i className="course-opening-node is-three" />
          <span className="course-opening-emblem"><Mark size={42} /></span>
        </div>
        <p className="course-opening-kicker">
          {hanzi ? "FIRST CHARACTERS / 亲子探索" : middle ? "MIDDLE HORIZONS / 语境探索" : "LITTLE EXPLORERS / 今日探索"}
        </p>
        <strong>
          {hanzi ? "欢迎打开汉字启蒙天地" : middle ? "欢迎打开初中英语大门" : "欢迎打开基础英语大门"}
        </strong>
        <p className="course-opening-guide">
          {hanzi ? "看一看 · 听一听 · 找一找" : middle ? "READ · COLLOCATE · REMEMBER" : "LOOK · LISTEN · REMEMBER"}
        </p>
      </div>
      <div className="course-opening-track" aria-hidden="true"><span /></div>
      <button ref={skipRef} type="button" className="course-opening-skip" onClick={dismiss}>跳过开场</button>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay;
}
