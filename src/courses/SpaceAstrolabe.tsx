import { Compass, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface AstrolabeRealm {
  id: string;
  label: string;
  sub: string;
  count: number;
  unit: string;
  color: [number, number, number];
  hex: string;
  yaw: number;
  pitch: number;
}

const REALMS: readonly AstrolabeRealm[] = [
  {
    id: "word-atlas-open",
    label: "雅思英语",
    sub: "IELTS ATLAS · A1–C2",
    count: 7298,
    unit: "词",
    color: [232, 182, 90],
    hex: "#e8b65a",
    yaw: 0.45,
    pitch: 0.28,
  },
  {
    id: "middle-english",
    label: "初中英语",
    sub: "JUNIOR HIGH · 110 单元",
    count: 1100,
    unit: "词",
    color: [143, 178, 204],
    hex: "#8fb2cc",
    yaw: -1.15,
    pitch: -0.22,
  },
  {
    id: "primary-starter",
    label: "基础英语",
    sub: "PRIMARY · 33 主题",
    count: 300,
    unit: "词",
    color: [151, 184, 142],
    hex: "#97b88e",
    yaw: 2.05,
    pitch: 0.18,
  },
  {
    id: "hanzi-starter",
    label: "汉字启蒙",
    sub: "HANZI · 32 主题",
    count: 300,
    unit: "字",
    color: [229, 124, 90],
    hex: "#e57c5a",
    yaw: -2.65,
    pitch: -0.15,
  },
];

interface StarNode {
  x: number;
  y: number;
  z: number;
  realmIndex: number;
  size: number;
  seed: number;
  isCore?: boolean;
}

function buildAstrolabeNodes(): { stars: StarNode[]; links: [number, number, number][] } {
  const stars: StarNode[] = [];
  const links: [number, number, number][] = [];

  // Create 4 constellation clusters in 3D spherical coordinates
  REALMS.forEach((realm, rIdx) => {
    const baseRadius = 0.62;
    const cx = Math.cos(realm.pitch) * Math.sin(realm.yaw) * baseRadius;
    const cy = Math.sin(realm.pitch) * baseRadius;
    const cz = Math.cos(realm.pitch) * Math.cos(realm.yaw) * baseRadius;

    const coreIdx = stars.length;
    stars.push({
      x: cx,
      y: cy,
      z: cz,
      realmIndex: rIdx,
      size: 6.5,
      seed: rIdx * 1.7,
      isCore: true,
    });

    const clusterCount = rIdx === 0 ? 28 : rIdx === 1 ? 22 : 16;
    let prevIdx = coreIdx;
    for (let i = 0; i < clusterCount; i++) {
      const a1 = (i / clusterCount) * Math.PI * 2 + rIdx * 1.1;
      const a2 = Math.sin(i * 2.3 + rIdx) * 0.45;
      const spread = 0.12 + (i % 5) * 0.048;
      const sx = cx + Math.cos(a1) * Math.cos(a2) * spread;
      const sy = cy + Math.sin(a2) * spread * 0.85;
      const sz = cz + Math.sin(a1) * Math.cos(a2) * spread;
      const idx = stars.length;
      stars.push({
        x: sx,
        y: sy,
        z: sz,
        realmIndex: rIdx,
        size: 2.2 + (i % 3) * 0.9,
        seed: i * 0.73 + rIdx,
      });
      if (i < 7) {
        links.push([coreIdx, idx, rIdx]);
      } else if (i % 2 === 0) {
        links.push([prevIdx, idx, rIdx]);
      }
      prevIdx = idx;
    }
  });

  // Add ambient deep-space dust stars
  for (let i = 0; i < 90; i++) {
    const theta = i * 2.39996;
    const y = 1 - (i / 89) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const rad = 0.92 + (i % 7) * 0.04;
    stars.push({
      x: Math.cos(theta) * r * rad,
      y: y * rad * 0.75,
      z: Math.sin(theta) * r * rad,
      realmIndex: -1,
      size: 1.1 + (i % 3) * 0.45,
      seed: i * 0.37,
    });
  }

  return { stars, links };
}

const SCENE = buildAstrolabeNodes();

function rotate3D(x: number, y: number, z: number, yaw: number, pitch: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
}

/**
 * Interactive 3D Celestial Astrolabe for the Learning Spaces Hub.
 * Supports pointer drag orbit, hover parallax, and constellation focusing.
 */
export function SpaceAstrolabe({
  activeRealmId,
  onSelectRealm,
  onEnterRealm,
}: {
  activeRealmId: string;
  onSelectRealm: (id: string) => void;
  onEnterRealm: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredRealm, setHoveredRealm] = useState<string | null>(null);
  const activeIndex = Math.max(
    0,
    REALMS.findIndex((r) => r.id === activeRealmId),
  );
  const activeRealm = REALMS[activeIndex] ?? REALMS[0];

  const camRef = useRef({
    yaw: -REALMS[0].yaw,
    pitch: 0.22,
    targetYaw: -REALMS[0].yaw,
    targetPitch: 0.22,
    velYaw: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: 0,
    pointerX: 0,
    pointerY: 0,
  });

  const coreScreenRef = useRef<{ id: string; x: number; y: number; r: number }[]>([]);

  useEffect(() => {
    const target = REALMS.find((r) => r.id === activeRealmId);
    if (!target) return;
    camRef.current.targetYaw = -target.yaw;
    camRef.current.targetPitch = Math.max(-0.45, Math.min(0.55, -target.pitch + 0.18));
  }, [activeRealmId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let visible = true;
    const t0 = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawFrame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cam = camRef.current;
      const time = (now - t0) * 0.001;

      if (!cam.dragging) {
        if (!reduced) {
          cam.targetYaw += 0.0012;
        }
        const dyaw = cam.targetYaw + cam.pointerX * 0.18 - cam.yaw;
        const dpitch = cam.targetPitch + cam.pointerY * 0.12 - cam.pitch;
        cam.yaw += dyaw * 0.065;
        cam.pitch += dpitch * 0.065;
      }

      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = Math.min(w, h) * 0.44;
      const fov = 2.15;

      // Subtle nebula core glow
      const [cr, cg, cb] = activeRealm.color;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, scale * 1.15);
      grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.22)`);
      grad.addColorStop(0.48, "rgba(25, 35, 62, 0.16)");
      grad.addColorStop(1, "rgba(13, 17, 32, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw 3D Armillary / Astrolabe Rings
      const rings = [
        { radius: 0.86, tiltX: 0.38, tiltZ: 0.15, color: "rgba(232, 182, 90, 0.22)", dash: [] as number[] },
        { radius: 0.72, tiltX: -0.52, tiltZ: 0.42, color: "rgba(143, 178, 204, 0.18)", dash: [4, 6] },
        { radius: 0.98, tiltX: 1.12, tiltZ: -0.28, color: "rgba(242, 235, 221, 0.12)", dash: [2, 8] },
      ];

      rings.forEach((ring, rIdx) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = rIdx === 0 ? 1.2 : 1;
        if (ring.dash.length) ctx.setLineDash(ring.dash);
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2 + (reduced ? 0 : time * (rIdx === 1 ? -0.08 : 0.05));
          let rx = Math.cos(a) * ring.radius;
          let ry = Math.sin(a) * Math.sin(ring.tiltX) * ring.radius;
          let rz = Math.sin(a) * Math.cos(ring.tiltX) * ring.radius;
          const cz2 = Math.cos(ring.tiltZ);
          const sz2 = Math.sin(ring.tiltZ);
          const rx2 = rx * cz2 - ry * sz2;
          const ry2 = rx * sz2 + ry * cz2;
          const p = rotate3D(rx2, ry2, rz, cam.yaw, cam.pitch);
          const depth = fov / (fov + p.z + 1.25);
          const sx = cx + p.x * scale * depth;
          const sy = cy + p.y * scale * depth;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Project all 3D stars
      const projected = SCENE.stars.map((s) => {
        const breathe = reduced ? 0 : Math.sin(time * 1.6 + s.seed) * 0.012;
        const p = rotate3D(s.x, s.y + breathe, s.z, cam.yaw, cam.pitch);
        const depth = fov / (fov + p.z + 1.25);
        return {
          ...s,
          sx: cx + p.x * scale * depth,
          sy: cy + p.y * scale * depth,
          z: p.z,
          depth,
        };
      });

      // Draw constellation links
      ctx.lineWidth = 1;
      for (const [aIdx, bIdx, rIdx] of SCENE.links) {
        const a = projected[aIdx];
        const b = projected[bIdx];
        if (!a || !b || a.z > 0.75 || b.z > 0.75) continue;
        const isFocused = rIdx === activeIndex;
        const [r, g, bl] = REALMS[rIdx].color;
        const alpha = (isFocused ? 0.46 : 0.14) * Math.min(a.depth, b.depth);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // Sort back-to-front for painter's algorithm
      const sorted = [...projected].sort((a, b) => b.z - a.z);
      const cores: { id: string; x: number; y: number; r: number }[] = [];

      for (const star of sorted) {
        const isRealmStar = star.realmIndex >= 0;
        const isFocused = star.realmIndex === activeIndex;
        const [r, g, b] = isRealmStar ? REALMS[star.realmIndex].color : [242, 235, 221];
        const twinkle = reduced ? 1 : 0.78 + 0.22 * Math.sin(time * 2.2 + star.seed * 5);
        const radius = Math.max(0.8, star.size * star.depth * (isFocused ? 1.22 : 0.95));
        const alpha = Math.min(
          1,
          (isRealmStar ? (isFocused ? 0.98 : 0.62) : 0.32) * star.depth * twinkle,
        );

        if (star.isCore && isRealmStar) {
          const realm = REALMS[star.realmIndex];
          cores.push({ id: realm.id, x: star.sx, y: star.sy, r: 24 });
          // Outer halo for realm core
          const haloRadius = radius * (isFocused ? 4.2 : 2.6);
          const halo = ctx.createRadialGradient(
            star.sx,
            star.sy,
            radius * 0.2,
            star.sx,
            star.sy,
            haloRadius,
          );
          halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${isFocused ? 0.65 : 0.32})`);
          halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(star.sx, star.sy, haloRadius, 0, Math.PI * 2);
          ctx.fill();

          if (isFocused) {
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.75)`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(star.sx, star.sy, radius * 2.1, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(star.sx, star.sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.isCore && isRealmStar && star.z < 0.45) {
          const realm = REALMS[star.realmIndex];
          ctx.font = `${isFocused ? "600 12px" : "500 11px"} var(--sans, sans-serif)`;
          ctx.fillStyle = isFocused ? "#fffdf8" : "rgba(242, 235, 221, 0.72)";
          ctx.textAlign = "center";
          ctx.fillText(realm.label, star.sx, star.sy - radius * 2.2 - 4);
        }
      }

      coreScreenRef.current = cores;
      ctx.restore();

      if (!reduced && visible) {
        raf = window.requestAnimationFrame(drawFrame);
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.cancelAnimationFrame(raf);
      if (visible) raf = window.requestAnimationFrame(drawFrame);
    });
    io.observe(canvas);

    raf = window.requestAnimationFrame(drawFrame);
    return () => {
      ro.disconnect();
      io.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [activeIndex, activeRealm]);

  const pickCore = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const core of coreScreenRef.current) {
      if (Math.hypot(x - core.x, y - core.y) <= core.r) return core.id;
    }
    return null;
  };

  return (
    <div className="space-astrolabe" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className={`space-astrolabe-canvas ${hoveredRealm ? "is-hovering-node" : ""}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          camRef.current.dragging = true;
          camRef.current.lastX = e.clientX;
          camRef.current.lastY = e.clientY;
          camRef.current.moved = 0;
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          camRef.current.pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
          camRef.current.pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
          if (!camRef.current.dragging) {
            setHoveredRealm(pickCore(e.clientX, e.clientY));
            return;
          }
          const dx = e.clientX - camRef.current.lastX;
          const dy = e.clientY - camRef.current.lastY;
          camRef.current.lastX = e.clientX;
          camRef.current.lastY = e.clientY;
          camRef.current.moved += Math.abs(dx) + Math.abs(dy);
          camRef.current.yaw -= dx * 0.007;
          camRef.current.pitch = Math.max(-0.65, Math.min(0.65, camRef.current.pitch + dy * 0.006));
          camRef.current.targetYaw = camRef.current.yaw;
          camRef.current.targetPitch = camRef.current.pitch;
        }}
        onPointerUp={(e) => {
          const moved = camRef.current.moved;
          camRef.current.dragging = false;
          if (moved < 8) {
            const hit = pickCore(e.clientX, e.clientY);
            if (hit) {
              if (hit === activeRealmId) onEnterRealm(hit);
              else onSelectRealm(hit);
            }
          }
        }}
        onPointerCancel={() => {
          camRef.current.dragging = false;
        }}
        onPointerLeave={() => {
          camRef.current.pointerX = 0;
          camRef.current.pointerY = 0;
          setHoveredRealm(null);
        }}
      />
      <div className="space-astrolabe-hud">
        <div className="space-astrolabe-badge">
          <Compass size={14} />
          <span>3D 浑天星盘 · 拖拽旋转或点选星域</span>
        </div>
        <div className="space-astrolabe-focus-card" style={{ "--realm-accent": activeRealm.hex } as React.CSSProperties}>
          <div>
            <small>{activeRealm.sub}</small>
            <strong>
              {activeRealm.label} · {activeRealm.count.toLocaleString("en-US")} {activeRealm.unit}
            </strong>
          </div>
          <span
            className="space-astrolabe-enter"
            onClick={() => onEnterRealm(activeRealm.id)}
          >
            <Sparkles size={14} /> 跃迁
          </span>
        </div>
        <div className="space-astrolabe-pills">
          {REALMS.map((realm) => (
            <span
              key={realm.id}
              className={`space-astrolabe-pill ${realm.id === activeRealmId ? "is-active" : ""}`}
              style={{ "--realm-accent": realm.hex } as React.CSSProperties}
              onPointerEnter={() => onSelectRealm(realm.id)}
              onClick={() => onSelectRealm(realm.id)}
            >
              <i />
              {realm.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
