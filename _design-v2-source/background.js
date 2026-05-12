// Ambient 3D wireframe — subtle background for app views
(function(){
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W, H;
  function resize(){
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Simple drifting wireframe rings
  const rings = [];
  for (let i = 0; i < 4; i++) {
    rings.push({ r: 180 + i * 90, tilt: 0.6 + i * 0.15, speed: 0.05 + i * 0.03, ph: i * 1.3 });
  }
  let t0 = performance.now();
  function frame(now){
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.72, cy = H * 0.32;

    rings.forEach((rr, idx) => {
      ctx.beginPath();
      const segs = 100;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const x = Math.cos(a) * rr.r;
        const y = Math.sin(a) * rr.r * Math.sin(rr.tilt + Math.sin(t * 0.1 + rr.ph) * 0.05);
        // rotate around center vertical axis
        const rot = t * rr.speed;
        const xr = x * Math.cos(rot) - 0 * Math.sin(rot);
        if (i === 0) ctx.moveTo(cx + xr, cy + y);
        else ctx.lineTo(cx + xr, cy + y);
      }
      ctx.strokeStyle = idx === 1 ? 'rgba(245,194,107,0.22)' : 'rgba(143,182,230,0.10)';
      ctx.lineWidth = idx === 1 ? 1 : 0.8;
      ctx.stroke();
    });

    // small drifting dots
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + t * 0.04;
      const r = 220 + Math.sin(t * 0.3 + i) * 80;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.5;
      ctx.fillStyle = `rgba(245,194,107,${0.1 + (i % 4) * 0.05})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
