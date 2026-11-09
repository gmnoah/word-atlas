import { Compass, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
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
    yaw: 0.42,
    pitch: 0.24,
  },
  {
    id: "middle-english",
    label: "初中英语",
    sub: "JUNIOR HIGH · 110 单元",
    count: 1100,
    unit: "词",
    color: [143, 178, 204],
    hex: "#8fb2cc",
    yaw: -1.12,
    pitch: -0.2,
  },
  {
    id: "primary-starter",
    label: "基础英语",
    sub: "PRIMARY · 33 主题",
    count: 300,
    unit: "词",
    color: [151, 184, 142],
    hex: "#97b88e",
    yaw: 1.98,
    pitch: 0.22,
  },
  {
    id: "hanzi-starter",
    label: "汉字启蒙",
    sub: "HANZI · 32 主题",
    count: 300,
    unit: "字",
    color: [229, 124, 90],
    hex: "#e57c5a",
    yaw: -2.68,
    pitch: -0.18,
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

  REALMS.forEach((realm, rIdx) => {
    const baseRadius = 0.68;
    const cx = Math.cos(realm.pitch) * Math.sin(realm.yaw) * baseRadius;
    const cy = Math.sin(realm.pitch) * baseRadius;
    const cz = Math.cos(realm.pitch) * Math.cos(realm.yaw) * baseRadius;

    const coreIdx = stars.length;
    stars.push({
      x: cx,
      y: cy,
      z: cz,
      realmIndex: rIdx,
      size: 7.5,
      seed: rIdx * 1.7,
      isCore: true,
    });

    const clusterCount = rIdx === 0 ? 34 : rIdx === 1 ? 28 : 22;
    let prevIdx = coreIdx;
    for (let i = 0; i < clusterCount; i++) {
      const a1 = (i / clusterCount) * Math.PI * 2 + rIdx * 1.1;
      const a2 = Math.sin(i * 2.3 + rIdx) * 0.52;
      const spread = 0.14 + (i % 6) * 0.052;
      const sx = cx + Math.cos(a1) * Math.cos(a2) * spread;
      const sy = cy + Math.sin(a2) * spread * 0.88;
      const sz = cz + Math.sin(a1) * Math.cos(a2) * spread;
      const idx = stars.length;
      stars.push({
        x: sx,
        y: sy,
        z: sz,
        realmIndex: rIdx,
        size: 2.5 + (i % 3) * 1.05,
        seed: i * 0.73 + rIdx,
      });
      if (i < 9) {
        links.push([coreIdx, idx, rIdx]);
      } else if (i % 2 === 0) {
        links.push([prevIdx, idx, rIdx]);
      }
      prevIdx = idx;
    }
  });

  // 180 deep-space stars on outer celestial shells
  for (let i = 0; i < 180; i++) {
    const theta = i * 2.39996;
    const y = 1 - (i / 179) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const rad = 0.96 + (i % 9) * 0.055;
    stars.push({
      x: Math.cos(theta) * r * rad,
      y: y * rad * 0.85,
      z: Math.sin(theta) * r * rad,
      realmIndex: -1,
      size: 1.2 + (i % 3) * 0.55,
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
 * Three.js-style 3D OrbitControls Celestial Armillary Sphere & Four-Realms Starfield.
 * Supports unobstructed 360-degree drag rotation with damping inertia, wheel/button zoom,
 * 3D meridian/parallel wireframe globe, 3D gimbal rings with ticks, and node picking.
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
  const [isDragging, setIsDragging] = useState(false);
  const activeIndex = Math.max(
    0,
    REALMS.findIndex((r) => r.id === activeRealmId),
  );
  const activeRealm = REALMS[activeIndex] ?? REALMS[0];

  const camRef = useRef({
    yaw: -REALMS[1].yaw,
    pitch: 0.24,
    zoom: 1.08,
    targetZoom: 1.08,
    velYaw: 0.0022,
    velPitch: 0,
    focusTargetYaw: null as number | null,
    focusTargetPitch: null as number | null,
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: 0,
  });

  const coreScreenRef = useRef<{ id: string; x: number; y: number; r: number }[]>([]);

  const focusRealmCamera = (realmId: string) => {
    const target = REALMS.find((r) => r.id === realmId);
    if (!target) return;
    camRef.current.focusTargetYaw = -target.yaw;
    camRef.current.focusTargetPitch = Math.max(-0.65, Math.min(0.65, -target.pitch + 0.15));
    camRef.current.velYaw = 0;
    camRef.current.velPitch = 0;
  };

  const adjustZoom = (delta: number) => {
    camRef.current.targetZoom = Math.max(0.68, Math.min(1.85, camRef.current.targetZoom + delta));
  };

  const resetCamera = () => {
    const target = REALMS.find((r) => r.id === activeRealmId) ?? REALMS[0];
    camRef.current.focusTargetYaw = -target.yaw;
    camRef.current.focusTargetPitch = 0.22;
    camRef.current.targetZoom = 1.08;
    camRef.current.velYaw = 0.002;
    camRef.current.velPitch = 0;
  };

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

    // Native wheel listener with passive: false so wheel zoom works smoothly without scrolling the page
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.12 : -0.12;
      camRef.current.targetZoom = Math.max(0.68, Math.min(1.85, camRef.current.targetZoom + step));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const drawFrame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cam = camRef.current;
      const time = (now - t0) * 0.001;

      // Smooth zoom interpolation
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.14;

      if (!cam.dragging) {
        if (cam.focusTargetYaw !== null && cam.focusTargetPitch !== null) {
          // Shortest angular distance for Yaw slerp
          let diffY = ((cam.focusTargetYaw - cam.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
          if (diffY < -Math.PI) diffY += Math.PI * 2;
          const diffP = cam.focusTargetPitch - cam.pitch;
          cam.yaw += diffY * 0.11;
          cam.pitch += diffP * 0.11;
          if (Math.hypot(diffY, diffP) < 0.015) {
            cam.focusTargetYaw = null;
            cam.focusTargetPitch = null;
            cam.velYaw = reduced ? 0 : 0.0018;
          }
        } else {
          // Damping inertia after user drag + gentle idle auto-orbit
          cam.yaw += cam.velYaw;
          cam.pitch = Math.max(-1.15, Math.min(1.15, cam.pitch + cam.velPitch));
          cam.velYaw *= 0.94;
          cam.velPitch *= 0.92;
          if (!reduced && Math.abs(cam.velYaw) < 0.0014) {
            cam.velYaw = (cam.velYaw >= 0 ? 1 : -1) * 0.0014;
          }
        }
      }

      const cx = w * 0.54;
      const cy = h * 0.5;
      const baseScale = Math.min(w, h) * 0.48 * cam.zoom;
      const fov = 2.25;

      // 1. Deep space nebula core glow
      const [cr, cg, cb] = activeRealm.color;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseScale * 1.25);
      grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.25)`);
      grad.addColorStop(0.45, "rgba(26, 38, 68, 0.2)");
      grad.addColorStop(1, "rgba(13, 17, 32, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 2. 3D Wireframe Celestial Sphere (Meridians & Parallels)
      const globeRadius = 0.78;
      // 6 Longitude Meridians
      for (let m = 0; m < 6; m++) {
        const lon = (m / 6) * Math.PI;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(242, 235, 221, 0.075)";
        ctx.lineWidth = 1;
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const lat = (i / steps) * Math.PI * 2;
          const gx = Math.sin(lat) * Math.cos(lon) * globeRadius;
          const gy = Math.cos(lat) * globeRadius;
          const gz = Math.sin(lat) * Math.sin(lon) * globeRadius;
          const p = rotate3D(gx, gy, gz, cam.yaw, cam.pitch);
          const depth = fov / (fov + p.z + 1.35);
          const sx = cx + p.x * baseScale * depth;
          const sy = cy + p.y * baseScale * depth;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 3 Latitude Parallels (Equator + Tropics)
      for (const latAngle of [-0.48, 0, 0.48]) {
        const rLat = Math.cos(latAngle) * globeRadius;
        const yLat = Math.sin(latAngle) * globeRadius;
        ctx.beginPath();
        ctx.strokeStyle = latAngle === 0 ? "rgba(232, 182, 90, 0.16)" : "rgba(143, 178, 204, 0.09)";
        ctx.lineWidth = latAngle === 0 ? 1.2 : 0.9;
        const steps = 56;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const p = rotate3D(Math.cos(a) * rLat, yLat, Math.sin(a) * rLat, cam.yaw, cam.pitch);
          const depth = fov / (fov + p.z + 1.35);
          const sx = cx + p.x * baseScale * depth;
          const sy = cy + p.y * baseScale * depth;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 3. Three 3D Tilted Armillary Gimbal Rings + Degree Ticks
      const rings = [
        { radius: 0.94, tiltX: 0.42, tiltZ: 0.16, color: "rgba(232, 182, 90, 0.34)", dash: [] as number[], ticks: 24 },
        { radius: 0.84, tiltX: -0.58, tiltZ: 0.45, color: "rgba(143, 178, 204, 0.25)", dash: [5, 6], ticks: 0 },
        { radius: 1.05, tiltX: 1.15, tiltZ: -0.32, color: "rgba(242, 235, 221, 0.16)", dash: [2, 8], ticks: 12 },
      ];

      rings.forEach((ring, rIdx) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = rIdx === 0 ? 1.5 : 1.1;
        if (ring.dash.length) ctx.setLineDash(ring.dash);
        const steps = 72;
        const spin = reduced ? 0 : time * (rIdx === 1 ? -0.07 : 0.045);
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2 + spin;
          const rx = Math.cos(a) * ring.radius;
          const ry = Math.sin(a) * Math.sin(ring.tiltX) * ring.radius;
          const rz = Math.sin(a) * Math.cos(ring.tiltX) * ring.radius;
          const cz2 = Math.cos(ring.tiltZ);
          const sz2 = Math.sin(ring.tiltZ);
          const rx2 = rx * cz2 - ry * sz2;
          const ry2 = rx * sz2 + ry * cz2;
          const p = rotate3D(rx2, ry2, rz, cam.yaw, cam.pitch);
          const depth = fov / (fov + p.z + 1.35);
          const sx = cx + p.x * baseScale * depth;
          const sy = cy + p.y * baseScale * depth;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Draw 3D degree tick marks on main armillary rings
        if (ring.ticks > 0) {
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(232, 182, 90, 0.42)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let t = 0; t < ring.ticks; t++) {
            const a = (t / ring.ticks) * Math.PI * 2 + spin;
            for (const [rIn, rOut] of [[ring.radius * 0.965, ring.radius * 1.035]]) {
              const p1 = rotate3D(
                (Math.cos(a) * Math.cos(ring.tiltZ) - Math.sin(a) * Math.sin(ring.tiltX) * Math.sin(ring.tiltZ)) * rIn,
                (Math.cos(a) * Math.sin(ring.tiltZ) + Math.sin(a) * Math.sin(ring.tiltX) * Math.cos(ring.tiltZ)) * rIn,
                Math.sin(a) * Math.cos(ring.tiltX) * rIn,
                cam.yaw,
                cam.pitch,
              );
              const p2 = rotate3D(
                (Math.cos(a) * Math.cos(ring.tiltZ) - Math.sin(a) * Math.sin(ring.tiltX) * Math.sin(ring.tiltZ)) * rOut,
                (Math.cos(a) * Math.sin(ring.tiltZ) + Math.sin(a) * Math.sin(ring.tiltX) * Math.cos(ring.tiltZ)) * rOut,
                Math.sin(a) * Math.cos(ring.tiltX) * rOut,
                cam.yaw,
                cam.pitch,
              );
              const d1 = fov / (fov + p1.z + 1.35);
              const d2 = fov / (fov + p2.z + 1.35);
              ctx.moveTo(cx + p1.x * baseScale * d1, cy + p1.y * baseScale * d1);
              ctx.lineTo(cx + p2.x * baseScale * d2, cy + p2.y * baseScale * d2);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      });

      // 4. Central Astrolabe Axis Core
      const centerHalo = ctx.createRadialGradient(cx, cy, 1, cx, cy, 22 * cam.zoom);
      centerHalo.addColorStop(0, "rgba(255, 248, 225, 0.9)");
      centerHalo.addColorStop(0.35, `rgba(${cr}, ${cg}, ${cb}, 0.45)`);
      centerHalo.addColorStop(1, "rgba(232, 182, 90, 0)");
      ctx.fillStyle = centerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();

      // 5. Project all 3D stars
      const projected = SCENE.stars.map((s) => {
        const breathe = reduced ? 0 : Math.sin(time * 1.6 + s.seed) * 0.012;
        const p = rotate3D(s.x, s.y + breathe, s.z, cam.yaw, cam.pitch);
        const depth = fov / (fov + p.z + 1.35);
        return {
          ...s,
          sx: cx + p.x * baseScale * depth,
          sy: cy + p.y * baseScale * depth,
          z: p.z,
          depth,
        };
      });

      // 6. Draw 3D Constellation Links + Axis Spokes from Center to each Realm Core
      for (let rIdx = 0; rIdx < REALMS.length; rIdx++) {
        const core = projected.find((s) => s.isCore && s.realmIndex === rIdx);
        if (!core) continue;
        const [r, g, b] = REALMS[rIdx].color;
        const isFocused = rIdx === activeIndex;
        ctx.save();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${isFocused ? 0.38 : 0.14})`;
        ctx.lineWidth = isFocused ? 1.3 : 0.9;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(core.sx, core.sy);
        ctx.stroke();
        ctx.restore();
      }

      ctx.lineWidth = 1.15;
      for (const [aIdx, bIdx, rIdx] of SCENE.links) {
        const a = projected[aIdx];
        const b = projected[bIdx];
        if (!a || !b || a.z > 0.85 || b.z > 0.85) continue;
        const isFocused = rIdx === activeIndex;
        const [r, g, bl] = REALMS[rIdx].color;
        const alpha = (isFocused ? 0.56 : 0.18) * Math.min(a.depth, b.depth);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // 7. Sort back-to-front for painter's algorithm
      const sorted = [...projected].sort((a, b) => b.z - a.z);
      const cores: { id: string; x: number; y: number; r: number }[] = [];

      for (const star of sorted) {
        const isRealmStar = star.realmIndex >= 0;
        const isFocused = star.realmIndex === activeIndex;
        const [r, g, b] = isRealmStar ? REALMS[star.realmIndex].color : [242, 235, 221];
        const twinkle = reduced ? 1 : 0.78 + 0.22 * Math.sin(time * 2.2 + star.seed * 5);
        const radius = Math.max(0.9, star.size * star.depth * cam.zoom * (isFocused ? 1.25 : 0.95));
        const alpha = Math.min(
          1,
          (isRealmStar ? (isFocused ? 1 : 0.68) : 0.36) * star.depth * twinkle,
        );

        if (star.isCore && isRealmStar) {
          const realm = REALMS[star.realmIndex];
          cores.push({ id: realm.id, x: star.sx, y: star.sy, r: 30 });
          const haloRadius = radius * (isFocused ? 4.4 : 2.8);
          const halo = ctx.createRadialGradient(
            star.sx,
            star.sy,
            radius * 0.2,
            star.sx,
            star.sy,
            haloRadius,
          );
          halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${isFocused ? 0.72 : 0.38})`);
          halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(star.sx, star.sy, haloRadius, 0, Math.PI * 2);
          ctx.fill();

          if (isFocused) {
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(star.sx, star.sy, radius * 2.15, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(star.sx, star.sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.isCore && isRealmStar && star.z < 0.65) {
          const realm = REALMS[star.realmIndex];
          ctx.font = `${isFocused ? "600 13px" : "500 11.5px"} var(--sans, sans-serif)`;
          ctx.fillStyle = isFocused ? "#fffdf8" : "rgba(242, 235, 221, 0.8)";
          ctx.textAlign = "center";
          ctx.fillText(realm.label, star.sx, star.sy - radius * 2.2 - 5);
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
      canvas.removeEventListener("wheel", onWheel);
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
    <div
      className={`space-astrolabe ${isDragging ? "is-dragging" : ""} ${hoveredRealm ? "is-hovering-node" : ""}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="space-astrolabe-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          camRef.current.dragging = true;
          camRef.current.focusTargetYaw = null;
          camRef.current.focusTargetPitch = null;
          camRef.current.lastX = e.clientX;
          camRef.current.lastY = e.clientY;
          camRef.current.moved = 0;
          setIsDragging(true);
        }}
        onPointerMove={(e) => {
          if (!camRef.current.dragging) {
            setHoveredRealm(pickCore(e.clientX, e.clientY));
            return;
          }
          const dx = e.clientX - camRef.current.lastX;
          const dy = e.clientY - camRef.current.lastY;
          camRef.current.lastX = e.clientX;
          camRef.current.lastY = e.clientY;
          camRef.current.moved += Math.abs(dx) + Math.abs(dy);
          const deltaYaw = -dx * 0.0085;
          const deltaPitch = dy * 0.0075;
          camRef.current.yaw += deltaYaw;
          camRef.current.pitch = Math.max(-1.1, Math.min(1.1, camRef.current.pitch + deltaPitch));
          camRef.current.velYaw = deltaYaw * 0.65;
          camRef.current.velPitch = deltaPitch * 0.65;
        }}
        onPointerUp={(e) => {
          const moved = camRef.current.moved;
          camRef.current.dragging = false;
          setIsDragging(false);
          if (moved < 8) {
            const hit = pickCore(e.clientX, e.clientY);
            if (hit) {
              if (hit === activeRealmId) {
                onEnterRealm(hit);
              } else {
                onSelectRealm(hit);
                focusRealmCamera(hit);
              }
            }
          }
        }}
        onPointerCancel={() => {
          camRef.current.dragging = false;
          setIsDragging(false);
        }}
        onPointerLeave={() => {
          setHoveredRealm(null);
        }}
      />
      <div className="space-astrolabe-hud">
        <div className="space-astrolabe-top-bar">
          <div className="space-astrolabe-badge">
            <Compass size={14} />
            <span>3D 浑天星盘 · 按住任意处拖拽旋转 / 滚轮缩放</span>
          </div>
          <div className="space-astrolabe-orbit-tools">
            <span
              className="space-astrolabe-tool"
              title="放大星盘"
              onClick={() => adjustZoom(0.18)}
            >
              <Plus size={14} />
            </span>
            <span
              className="space-astrolabe-tool"
              title="缩小星盘"
              onClick={() => adjustZoom(-0.18)}
            >
              <Minus size={14} />
            </span>
            <span
              className="space-astrolabe-tool"
              title="重置三维视角"
              onClick={resetCamera}
            >
              <RotateCcw size={14} />
            </span>
          </div>
        </div>
        <div
          className="space-astrolabe-focus-card"
          style={{ "--realm-accent": activeRealm.hex } as React.CSSProperties}
        >
          <span className="space-astrolabe-kicker">{activeRealm.sub}</span>
          <div className="space-astrolabe-title-row">
            <strong>{activeRealm.label}</strong>
            <em>
              {activeRealm.count.toLocaleString("en-US")} {activeRealm.unit}
            </em>
          </div>
          <span
            className="space-astrolabe-jump"
            onClick={() => onEnterRealm(activeRealm.id)}
          >
            <Sparkles size={13} /> 跃迁进入星域
          </span>
        </div>
        <div className="space-astrolabe-pills">
          {REALMS.map((realm) => (
            <span
              key={realm.id}
              className={`space-astrolabe-pill ${realm.id === activeRealmId ? "is-active" : ""}`}
              style={{ "--realm-accent": realm.hex } as React.CSSProperties}
              onClick={() => {
                onSelectRealm(realm.id);
                focusRealmCamera(realm.id);
              }}
            >
              <i style={{ background: realm.hex }} />
              {realm.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
