"use client";

import { useEffect, useRef } from "react";

/**
 * v2 Command Sphere — 와이어프레임 구체 + 궤도 + 데이터 노드.
 * Three.js 없이 순수 Canvas 2D. 60fps.
 */
export function CommandSphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let raf = 0;

    function resize() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // 와이어프레임 점 (배경 sparse)
    const pts: { x: number; y: number; z: number }[] = [];
    const rings = 14;
    for (let i = 0; i <= rings; i++) {
      const lat = (i / rings) * Math.PI - Math.PI / 2;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      const segs = Math.max(6, Math.round(Math.cos(lat) * 28));
      for (let j = 0; j < segs; j++) {
        const lon = (j / segs) * Math.PI * 2;
        pts.push({
          x: cosLat * Math.cos(lon),
          y: sinLat,
          z: cosLat * Math.sin(lon),
        });
      }
    }

    // 데이터 노드 (반짝이는 점)
    const nodes: Array<{
      lat: number;
      lon: number;
      size: number;
      hl: boolean;
    }> = [];
    for (let i = 0; i < 36; i++) {
      const lat = (Math.random() - 0.5) * Math.PI * 0.95;
      const lon = Math.random() * Math.PI * 2;
      nodes.push({
        lat,
        lon,
        size: 1.2 + Math.random() * 1.6,
        hl: Math.random() < 0.15,
      });
    }

    // 궤도 (구체 바깥)
    const orbits = [
      { r: 1.18, tilt: 0.3, speed: 0.18 },
      { r: 1.34, tilt: -0.45, speed: -0.11 },
      { r: 1.55, tilt: 0.15, speed: 0.07 },
    ];

    const t0 = performance.now();
    function draw(now: number) {
      const t = (now - t0) / 1000;
      ctx!.clearRect(0, 0, W, H);

      const cx = W * 0.52;
      const cy = H * 0.5;
      const R = Math.min(W, H) * 0.32;
      const rotY = t * 0.18;
      const rotX = Math.sin(t * 0.12) * 0.15 - 0.18;

      function project(p: { x: number; y: number; z: number }) {
        const cy1 = Math.cos(rotY);
        const sy1 = Math.sin(rotY);
        const x = p.x * cy1 - p.z * sy1;
        const z = p.x * sy1 + p.z * cy1;
        const y = p.y;
        const cx1 = Math.cos(rotX);
        const sx1 = Math.sin(rotX);
        const y2 = y * cx1 - z * sx1;
        const z2 = y * sx1 + z * cx1;
        const persp = 1.8;
        const f = persp / (persp + z2);
        return { sx: cx + x * R * f, sy: cy + y2 * R * f, z: z2, f };
      }

      // 궤도 + 궤도 도트
      orbits.forEach((o, oi) => {
        ctx!.beginPath();
        const segs = 80;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2 + t * o.speed;
          const p = {
            x: Math.cos(a) * o.r,
            y: Math.sin(o.tilt) * Math.sin(a) * 0.3,
            z: Math.sin(a) * o.r * Math.cos(o.tilt),
          };
          const pr = project(p);
          if (i === 0) ctx!.moveTo(pr.sx, pr.sy);
          else ctx!.lineTo(pr.sx, pr.sy);
        }
        ctx!.strokeStyle =
          oi === 0 ? "rgba(245,194,107,0.32)" : "rgba(143,182,230,0.18)";
        ctx!.lineWidth = oi === 0 ? 1.1 : 0.8;
        ctx!.stroke();

        // 궤도 위 도트
        const ang = t * o.speed * 2;
        const p = {
          x: Math.cos(ang) * o.r,
          y: Math.sin(o.tilt) * Math.sin(ang) * 0.3,
          z: Math.sin(ang) * o.r * Math.cos(o.tilt),
        };
        const pr = project(p);
        ctx!.beginPath();
        ctx!.arc(pr.sx, pr.sy, 3, 0, Math.PI * 2);
        ctx!.fillStyle = oi === 0 ? "#F5C26B" : "#8FB6E6";
        ctx!.fill();
      });

      // 와이어프레임 점 — 뒤 hemisphere (희미)
      const projected = pts.map(project);
      ctx!.fillStyle = "rgba(245,194,107,0.10)";
      projected.forEach((pr) => {
        if (pr.z >= 0) return;
        ctx!.fillRect(pr.sx - 0.7, pr.sy - 0.7, 1.4, 1.4);
      });

      // 위도선 (앞 hemisphere)
      const lats = 8;
      const lons = 16;
      ctx!.strokeStyle = "rgba(245,194,107,0.22)";
      ctx!.lineWidth = 0.9;
      for (let li = 1; li < lats; li++) {
        const lat = (li / lats) * Math.PI - Math.PI / 2;
        ctx!.beginPath();
        let started = false;
        for (let j = 0; j <= 60; j++) {
          const lon = (j / 60) * Math.PI * 2;
          const p = {
            x: Math.cos(lat) * Math.cos(lon),
            y: Math.sin(lat),
            z: Math.cos(lat) * Math.sin(lon),
          };
          const pr = project(p);
          if (pr.z < -0.1) {
            started = false;
            continue;
          }
          if (!started) {
            ctx!.moveTo(pr.sx, pr.sy);
            started = true;
          } else ctx!.lineTo(pr.sx, pr.sy);
        }
        ctx!.stroke();
      }
      // 경도선
      for (let lo = 0; lo < lons; lo++) {
        const lon = (lo / lons) * Math.PI * 2;
        ctx!.beginPath();
        let started = false;
        for (let j = 0; j <= 40; j++) {
          const lat = (j / 40) * Math.PI - Math.PI / 2;
          const p = {
            x: Math.cos(lat) * Math.cos(lon),
            y: Math.sin(lat),
            z: Math.cos(lat) * Math.sin(lon),
          };
          const pr = project(p);
          if (pr.z < -0.1) {
            started = false;
            continue;
          }
          if (!started) {
            ctx!.moveTo(pr.sx, pr.sy);
            started = true;
          } else ctx!.lineTo(pr.sx, pr.sy);
        }
        ctx!.stroke();
      }

      // 데이터 노드 (반짝)
      nodes.forEach((n) => {
        const p = {
          x: Math.cos(n.lat) * Math.cos(n.lon),
          y: Math.sin(n.lat),
          z: Math.cos(n.lat) * Math.sin(n.lon),
        };
        const pr = project(p);
        if (pr.z < -0.2) return;
        const a = Math.min(1, 0.4 + pr.f * 0.7);
        ctx!.beginPath();
        ctx!.arc(pr.sx, pr.sy, n.size * pr.f, 0, Math.PI * 2);
        if (n.hl) {
          ctx!.fillStyle = `rgba(245,194,107,${a})`;
          ctx!.fill();
          ctx!.beginPath();
          ctx!.arc(pr.sx, pr.sy, n.size * pr.f * 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(245,194,107,${a * 0.18})`;
          ctx!.fill();
        } else {
          ctx!.fillStyle = `rgba(237,238,240,${a * 0.6})`;
          ctx!.fill();
        }
        n.lon += 0.0005;
      });

      // 중심 크로스헤어
      ctx!.strokeStyle = "rgba(245,194,107,0.4)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(cx - 6, cy);
      ctx!.lineTo(cx + 6, cy);
      ctx!.moveTo(cx, cy - 6);
      ctx!.lineTo(cx, cy + 6);
      ctx!.stroke();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="block h-full w-full min-h-[420px]"
    />
  );
}
