// Nexus app — view router, animations, sphere, simulator, AI
(function(){
  'use strict';

  // ============ VIEW ROUTER ============
  const views = document.querySelectorAll('.view');
  const navItems = document.querySelectorAll('.side-item[data-view]');
  const breadCur = document.getElementById('bread-cur');
  const breadMap = {
    dashboard: '대시보드', payroll: '급여', approvals: '전자결재',
    simulator: '시뮬레이터', ask: 'Ask Nexus', risk: '리스크 모니터',
    liveops: 'Live Ops',
    employees: '직원 정보', attendance: '근태 캘린더', leave: '연차',
    expenses: '지출', vendors: '거래처', assets: '자산',
    close: '월말 결산', severance: '퇴직급여', yearend: '연말정산',
    audit: '감사 로그', settings: '설정'
  };

  window.goView = function(name){
    views.forEach(v => v.classList.toggle('on', v.dataset.view === name));
    navItems.forEach(n => n.classList.toggle('active', n.dataset.view === name));
    breadCur.textContent = breadMap[name] || name;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (name === 'dashboard') { animateKPIs(); }
    if (name === 'simulator') { recalc(); }
    if (name === 'ask') { setTimeout(()=>document.getElementById('askMega')?.focus(), 250); }
  };

  navItems.forEach(n => {
    if (!n.dataset.view) return;
    n.addEventListener('click', e => { e.preventDefault(); goView(n.dataset.view); });
  });

  // ============ ANIMATED KPI COUNTERS ============
  function fmtNum(n, prefix){
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (prefix || '') + s;
  }
  function animateKPIs(){
    document.querySelectorAll('.kpi-v[data-num]').forEach(el => {
      const target = parseFloat(el.dataset.num);
      const prefix = el.dataset.prefix || '';
      const start = performance.now();
      const dur = 1100;
      const cur = el.querySelector('.cur');
      function tick(t){
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = '';
        if (cur) { el.appendChild(cur); el.append(fmtNum(v).replace(/^/, '')); }
        else { el.textContent = fmtNum(v, prefix); }
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  animateKPIs();

  // ============ COMMAND SPHERE ============
  const sphereCanvas = document.getElementById('sphereCanvas');
  if (sphereCanvas) {
    const ctx = sphereCanvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize(){
      const r = sphereCanvas.getBoundingClientRect();
      W = r.width; H = r.height;
      sphereCanvas.width = W * dpr; sphereCanvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // build sphere geometry
    const pts = [];
    const rings = 14;
    for (let i = 0; i <= rings; i++) {
      const lat = (i / rings) * Math.PI - Math.PI / 2;
      const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
      const segs = Math.max(6, Math.round(Math.cos(lat) * 28));
      for (let j = 0; j < segs; j++) {
        const lon = (j / segs) * Math.PI * 2;
        pts.push({ x: cosLat * Math.cos(lon), y: sinLat, z: cosLat * Math.sin(lon) });
      }
    }
    // orbit data nodes
    const nodes = [];
    for (let i = 0; i < 36; i++) {
      const lat = (Math.random() - 0.5) * Math.PI * 0.95;
      const lon = Math.random() * Math.PI * 2;
      nodes.push({ lat, lon, size: 1.2 + Math.random() * 1.6, hl: Math.random() < 0.15 });
    }
    // orbit rings (outside)
    const orbits = [
      { r: 1.18, tilt: 0.3, speed: 0.18 },
      { r: 1.34, tilt: -0.45, speed: -0.11 },
      { r: 1.55, tilt: 0.15, speed: 0.07 }
    ];

    let t0 = performance.now();
    function draw(now){
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      const cx = W * 0.52, cy = H * 0.5;
      const R = Math.min(W, H) * 0.32;
      const rotY = t * 0.18;
      const rotX = Math.sin(t * 0.12) * 0.15 - 0.18;

      function project(p){
        // rotate Y
        const cy1 = Math.cos(rotY), sy1 = Math.sin(rotY);
        let x = p.x * cy1 - p.z * sy1;
        let z = p.x * sy1 + p.z * cy1;
        let y = p.y;
        // rotate X
        const cx1 = Math.cos(rotX), sx1 = Math.sin(rotX);
        const y2 = y * cx1 - z * sx1;
        const z2 = y * sx1 + z * cx1;
        // perspective
        const persp = 1.8;
        const f = persp / (persp + z2);
        return { sx: cx + x * R * f, sy: cy + y2 * R * f, z: z2, f };
      }

      // outer orbit rings
      orbits.forEach((o, oi) => {
        ctx.beginPath();
        const segs = 80;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2 + t * o.speed;
          const p = { x: Math.cos(a) * o.r, y: Math.sin(o.tilt) * Math.sin(a) * 0.3, z: Math.sin(a) * o.r * Math.cos(o.tilt) };
          const pr = project(p);
          if (i === 0) ctx.moveTo(pr.sx, pr.sy);
          else ctx.lineTo(pr.sx, pr.sy);
        }
        ctx.strokeStyle = oi === 0 ? 'rgba(245,194,107,0.32)' : 'rgba(143,182,230,0.18)';
        ctx.lineWidth = oi === 0 ? 1.1 : 0.8;
        ctx.stroke();

        // dot on each orbit
        const ang = t * o.speed * 2;
        const p = { x: Math.cos(ang) * o.r, y: Math.sin(o.tilt) * Math.sin(ang) * 0.3, z: Math.sin(ang) * o.r * Math.cos(o.tilt) };
        const pr = project(p);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = oi === 0 ? '#F5C26B' : '#8FB6E6';
        ctx.fill();
      });

      // wireframe sphere — split front/back
      const projected = pts.map(project);
      // back hemisphere (faint)
      ctx.fillStyle = 'rgba(245,194,107,0.10)';
      projected.forEach(pr => {
        if (pr.z >= 0) return;
        ctx.fillRect(pr.sx - 0.7, pr.sy - 0.7, 1.4, 1.4);
      });
      // longitude/latitude lines — front
      const lats = 8, lons = 16;
      ctx.strokeStyle = 'rgba(245,194,107,0.22)';
      ctx.lineWidth = 0.9;
      for (let li = 1; li < lats; li++){
        const lat = (li / lats) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= 60; j++){
          const lon = (j / 60) * Math.PI * 2;
          const p = { x: Math.cos(lat)*Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat)*Math.sin(lon) };
          const pr = project(p);
          if (pr.z < -0.1) { started = false; continue; }
          if (!started) { ctx.moveTo(pr.sx, pr.sy); started = true; }
          else ctx.lineTo(pr.sx, pr.sy);
        }
        ctx.stroke();
      }
      for (let lo = 0; lo < lons; lo++){
        const lon = (lo / lons) * Math.PI * 2;
        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= 40; j++){
          const lat = (j / 40) * Math.PI - Math.PI / 2;
          const p = { x: Math.cos(lat)*Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat)*Math.sin(lon) };
          const pr = project(p);
          if (pr.z < -0.1) { started = false; continue; }
          if (!started) { ctx.moveTo(pr.sx, pr.sy); started = true; }
          else ctx.lineTo(pr.sx, pr.sy);
        }
        ctx.stroke();
      }

      // data nodes
      nodes.forEach(n => {
        const p = { x: Math.cos(n.lat)*Math.cos(n.lon), y: Math.sin(n.lat), z: Math.cos(n.lat)*Math.sin(n.lon) };
        const pr = project(p);
        if (pr.z < -0.2) return;
        const a = Math.min(1, 0.4 + pr.f * 0.7);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, n.size * pr.f, 0, Math.PI * 2);
        if (n.hl) {
          ctx.fillStyle = `rgba(245,194,107,${a})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, n.size * pr.f * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245,194,107,${a * 0.18})`;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(237,238,240,${a * 0.6})`;
          ctx.fill();
        }
        n.lon += 0.0005;
      });

      // crosshair center
      ctx.strokeStyle = 'rgba(245,194,107,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ============ SIMULATOR ============
  const BASE = {
    headcount: 15,
    monthlyPayroll: 84_210_000, // KRW MTD
    avgSalary: 5_614_000
  };
  const slHire = document.getElementById('sl-hire');
  const slRaise = document.getElementById('sl-raise');
  const slMin = document.getElementById('sl-min');
  const slNight = document.getElementById('sl-night');

  function fmtKRW(n){ return Math.round(n).toLocaleString('en-US'); }
  function recalc(){
    if (!slHire) return;
    const hire = +slHire.value;
    const raise = +slRaise.value / 100;
    const minWage = +slMin.value;
    const night = +slNight.value;

    document.getElementById('sv-hire').textContent = hire;
    document.getElementById('sv-raise').textContent = (+slRaise.value).toFixed(1);
    document.getElementById('sv-min').textContent = minWage.toLocaleString('en-US');
    document.getElementById('sv-night').textContent = night;

    const newHead = BASE.headcount + hire;
    // base after raise
    const raised = BASE.monthlyPayroll * (1 + raise);
    // add new hires at avg salary
    const withHires = raised + hire * BASE.avgSalary;
    // night premium (0.5 multiplier × hourly × headcount × hours)
    // assume hourly ≈ avg / 209h, premium = 0.5
    const hourly = BASE.avgSalary / 209;
    const nightCost = hourly * 0.5 * night * newHead;
    // min wage uplift — if minimum wage push raises lowest tier
    const minWageBase = 10030;
    const minDelta = Math.max(0, (minWage - minWageBase) / minWageBase);
    const minWageImpact = BASE.monthlyPayroll * 0.18 * minDelta; // ~18% of payroll near floor

    const projected = withHires + nightCost + minWageImpact;
    const diff = projected - BASE.monthlyPayroll;
    const diffPct = (diff / BASE.monthlyPayroll) * 100;

    document.getElementById('rv-month').textContent = (projected / 1_000_000).toFixed(1);
    document.getElementById('rv-diff').textContent = (diff >= 0 ? '+' : '−') + fmtKRW(Math.abs(diff));
    document.getElementById('rv-year').textContent = Math.round(projected * 12 / 1_000_000).toLocaleString();
    document.getElementById('rv-head').textContent = newHead;
    document.getElementById('rv-avg').textContent = (projected / newHead / 1_000_000).toFixed(2);

    const dEl = document.getElementById('rv-diff-pct');
    dEl.textContent = (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diffPct).toFixed(1) + '%';
    dEl.className = 'd ' + (diff >= 0 ? 'up' : 'down');

    const vEl = document.getElementById('rv-violation');
    if (minWage > 10300) { vEl.textContent = '3명 위반'; vEl.style.color = 'var(--red)'; }
    else { vEl.textContent = '없음'; vEl.style.color = 'var(--green)'; }
  }
  [slHire, slRaise, slMin, slNight].forEach(s => s && s.addEventListener('input', recalc));
  const resetBtn = document.getElementById('resetSim');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    slHire.value = 0; slRaise.value = 0; slMin.value = 10030; slNight.value = 8; recalc();
  });
  recalc();

  // ============ EMPLOYEE SELECT ============
  document.querySelectorAll('.emp-row').forEach(row => {
    row.addEventListener('click', () => {
      document.querySelectorAll('.emp-row').forEach(r => r.classList.remove('sel'));
      row.classList.add('sel');
      // (would normally load detail; demo keeps current)
    });
  });

  // ============ MODALS ============
  const askBack = document.getElementById('askBack');
  const expBack = document.getElementById('expBack');
  const askInput = document.getElementById('askInput');

  window.openAsk = () => { askBack.classList.add('on'); setTimeout(() => askInput?.focus(), 50); };
  window.closeAsk = () => askBack.classList.remove('on');
  window.openExpense = () => expBack.classList.add('on');
  window.closeExpense = () => expBack.classList.remove('on');

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); openAsk(); }
    if (e.key === 'Escape') { closeAsk(); closeExpense(); }
  });

  // ============ ASK NEXUS (real AI) ============
  const askMega = document.getElementById('askMega');
  const askQ = document.getElementById('askQ');
  const askA = document.getElementById('askA');
  const askWrap = document.getElementById('askInputWrap');
  const suggestBtns = document.querySelectorAll('#askSuggest button');

  const COMPANY_CONTEXT = `너는 Nexus라는 한국 ERP의 AI 어시스턴트야. 회사는 15명 규모 스타트업이고 회사 데이터를 기반으로 답해.
회사 상태:
- 총 인원 15명 (개발 6, 영업 3, 디자인 2, 경영지원 2, 운영 2)
- 5월 MTD 인건비: ₩84.2M
- 5월 MTD 지출: ₩12.48M (SaaS ₩4.2M, 임대료 ₩3.5M, 접대비 ₩1.2M, 식대 ₩0.9M, 기타)
- 평균 기본급: ₩4,256K (개발팀 ₩4,612K로 최고)
- 미결 결재: 7건 (지출 3, 인사 2, 연차 1, 출장 1)
- 법적 리스크: 2건 (김지원 주52h 초과 위험, 연차촉진 미통보 3명)
- 최저시급 ₩10,030 · 전 직원 통과
- 4대보험 EDI 마감 D-5
- 야간근로 발생 직원: 김지원 4h, 박서연 2h, 정현우 6h
- 연차 잔여 5일 이하: 이민준(2), 최유진(3), 한도윤(5)
한국어로 간결하게, 가능하면 숫자와 함께 2~4문장으로 답해. 실제 데이터처럼 자연스럽게.`;

  async function askFull(q){
    if (!q || !askA) return;
    closeAsk();
    goView('ask');
    askMega.value = q;
    askQ.textContent = '> ' + q;
    askA.innerHTML = '<span class="cur"></span>';
    askWrap.classList.add('busy');

    try {
      const resp = await window.claude.complete({
        messages: [{ role: 'user', content: COMPANY_CONTEXT + '\n\n질문: ' + q }]
      });
      askWrap.classList.remove('busy');
      // typewriter
      const text = (typeof resp === 'string' ? resp : (resp.text || JSON.stringify(resp))).trim();
      askA.innerHTML = '';
      let i = 0;
      function type(){
        if (i >= text.length) { askA.innerHTML += '<span class="cur"></span>'; return; }
        askA.textContent = text.slice(0, i+1);
        i++;
        setTimeout(type, 12);
      }
      type();
    } catch(err) {
      askWrap.classList.remove('busy');
      askA.textContent = '응답 실패 — ' + (err.message || '네트워크 오류');
    }
  }
  window.askFull = askFull;

  if (askMega) {
    askMega.addEventListener('keydown', e => {
      if (e.key === 'Enter') askFull(askMega.value.trim());
    });
  }
  suggestBtns.forEach(b => b.addEventListener('click', () => askFull(b.textContent.trim())));

  if (askInput) {
    askInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') askFull(askInput.value.trim());
    });
  }

  // ============ LIVE OPS ============
  let loRaf = null, loInterval = null, loFlowInterval = null, loBurnInterval = null;
  const loEventsEl = document.getElementById('lo-events');
  const loStamp = document.getElementById('lo-stamp');
  const loBurn = document.getElementById('lo-burn');
  const loBps = document.getElementById('lo-bps');
  const loBhr = document.getElementById('lo-bhr');
  const loRate = document.getElementById('lo-rate');
  const loFlowNow = document.getElementById('lo-flow-now');
  const loSparkLine = document.getElementById('loSparkLine');
  const loSparkArea = document.getElementById('loSparkArea');
  const loRadar = document.getElementById('loRadar');

  const EVENT_TEMPLATES = [
    { tag: 'OCR',   cls: 'ok',   tmpl: '<b>박서연</b> 영수증 1건 자동 분류 · 카테고리 운영비' },
    { tag: 'PAY',   cls: 'info', tmpl: '<b>김지원</b> 5월 명세서 생성 · 실수령 ₩4,427,830' },
    { tag: 'APPR',  cls: 'ok',   tmpl: 'EX-237 AWS 정기지출 · <b>2단계</b> 승인됨' },
    { tag: 'RISK',  cls: 'crit', tmpl: '<b>김지원</b> 주52h 알림 · 잔여 −2.2h · 본인+관리자 전송' },
    { tag: 'LEAVE', cls: 'info', tmpl: '<b>이민준</b> 연차 신청 LV-079 · 검토 단계 진입' },
    { tag: 'EDI',   cls: 'warn', tmpl: '4대보험 EDI CSV 자동 생성 진행 중 · <b>87%</b>' },
    { tag: 'AUTH',  cls: 'ok',   tmpl: '<b>한도윤</b> 로그인 · 192.168.4.21 · macOS Safari' },
    { tag: 'CARD',  cls: 'info', tmpl: '법인카드 매입 ₩45,000 · 스타벅스 강남 · 자동 분개' },
    { tag: 'NIGHT', cls: 'warn', tmpl: '<b>정현우</b> 22:48 야간근로 시작 · +0.5 가산 자동' },
    { tag: 'AUDIT', cls: 'ok',   tmpl: 'audit_log · payroll.calc(emp=003) · 기록됨' },
    { tag: 'CLOSE', cls: 'info', tmpl: '5월 결산 체크리스트 <b>17 / 23</b> 완료' },
    { tag: 'SLACK', cls: 'ok',   tmpl: 'Slack 알림 · #ops 채널 · 결재 1건 푸시됨' },
    { tag: 'ML',    cls: 'info', tmpl: 'Gemini Vision · 영수증 OCR 신뢰도 <b>98.4%</b>' },
  ];
  let burnTotal = 84210000;
  const flowHistory = new Array(60).fill(0.8);

  function pad(n, l){ return String(n).padStart(l || 2, '0'); }
  function formatStamp(d){
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}<span class="ms">.${pad(Math.floor(d.getMilliseconds()/10), 2)}</span>`;
  }

  function pushEvent(){
    if (!loEventsEl) return;
    const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const now = new Date();
    const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const row = document.createElement('div');
    row.className = 'lo-event ' + tpl.cls;
    row.innerHTML = `<span class="ts">${ts}</span><span class="tag">${tpl.tag}</span><span class="msg">${tpl.tmpl}<span class="cur"></span></span>`;
    loEventsEl.prepend(row);
    // typewriter
    const msgEl = row.querySelector('.msg');
    const fullHTML = tpl.tmpl;
    msgEl.innerHTML = '';
    let i = 0;
    // strip tags for character-by-character then re-inject; simplified: type plain then swap
    const plain = fullHTML.replace(/<[^>]+>/g, '');
    function type(){
      if (i > plain.length) {
        msgEl.innerHTML = fullHTML + '<span class="cur"></span>';
        setTimeout(() => { const c = msgEl.querySelector('.cur'); if (c) c.remove(); }, 800);
        return;
      }
      msgEl.textContent = plain.slice(0, i);
      i++;
      setTimeout(type, 14 + Math.random() * 18);
    }
    type();
    // cap rows
    while (loEventsEl.children.length > 18) loEventsEl.removeChild(loEventsEl.lastChild);
  }

  function fmtCommas(n){ return Math.round(n).toLocaleString('en-US'); }

  // radar
  let radarRaf;
  function startRadar(){
    if (!loRadar) return;
    const c = loRadar.getContext('2d');
    const r = () => loRadar.getBoundingClientRect();
    function size(){ const b = r(); loRadar.width = b.width * 2; loRadar.height = b.height * 2; c.setTransform(2,0,0,2,0,0); return b; }
    let box = size();
    const dots = [];
    for (let i = 0; i < 15; i++){
      const r2 = 30 + Math.random() * 75;
      const a = Math.random() * Math.PI * 2;
      const status = i < 12 ? 'active' : (i < 13 ? 'idle' : 'off');
      dots.push({ r: r2, a, status, ph: Math.random() * Math.PI * 2 });
    }
    let t0 = performance.now();
    function tick(now){
      box = r();
      const cx = box.width / 2, cy = box.height / 2;
      c.clearRect(0, 0, box.width, box.height);
      // concentric rings
      for (let i = 1; i <= 3; i++){
        c.beginPath();
        c.arc(cx, cy, i * 30, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(245,194,107,0.08)';
        c.stroke();
      }
      // sweep arc
      const t = (now - t0) / 1000;
      const sweepA = (t * 0.6) % (Math.PI * 2);
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, 95, sweepA - 0.4, sweepA);
      c.closePath();
      c.fillStyle = 'rgba(245,194,107,0.10)';
      c.fill();
      // axis
      c.beginPath(); c.moveTo(cx - 95, cy); c.lineTo(cx + 95, cy); c.moveTo(cx, cy - 95); c.lineTo(cx, cy + 95);
      c.strokeStyle = 'rgba(46,52,62,0.6)'; c.stroke();
      // dots
      dots.forEach(d => {
        const x = cx + Math.cos(d.a) * d.r;
        const y = cy + Math.sin(d.a) * d.r;
        const pulse = 0.6 + Math.sin(t * 2 + d.ph) * 0.4;
        c.beginPath();
        c.arc(x, y, d.status === 'active' ? 3 : 2.5, 0, Math.PI * 2);
        c.fillStyle = d.status === 'active' ? `rgba(107,203,138,${pulse})` : d.status === 'idle' ? 'rgba(245,194,107,0.85)' : 'rgba(90,97,112,0.5)';
        c.fill();
        if (d.status === 'active') {
          c.beginPath();
          c.arc(x, y, 6, 0, Math.PI * 2);
          c.fillStyle = `rgba(107,203,138,${0.12 * pulse})`;
          c.fill();
        }
        d.a += 0.0008;
      });
      radarRaf = requestAnimationFrame(tick);
    }
    cancelAnimationFrame(radarRaf);
    radarRaf = requestAnimationFrame(tick);
  }

  function startLiveOps(){
    stopLiveOps();
    // 60Hz clock
    function clockTick(){
      if (loStamp) loStamp.innerHTML = formatStamp(new Date());
      loRaf = requestAnimationFrame(clockTick);
    }
    loRaf = requestAnimationFrame(clockTick);

    // event stream every 1.4-3.2s
    function schedEvent(){
      pushEvent();
      loInterval = setTimeout(schedEvent, 1200 + Math.random() * 2200);
    }
    schedEvent();

    // burn rate — ₩47/sec accumulating
    loBurnInterval = setInterval(() => {
      const inc = 45 + Math.floor(Math.random() * 6);
      burnTotal += inc;
      if (loBurn) loBurn.textContent = fmtCommas(burnTotal);
      if (loBps) loBps.textContent = '₩' + inc;
      if (loRate) loRate.textContent = (38 + Math.random() * 12).toFixed(1);
    }, 1000);

    // flow throughput sparkline — new point every second
    loFlowInterval = setInterval(() => {
      const v = 0.6 + Math.random() * 1.2 + (Math.sin(Date.now()/8000) * 0.3);
      flowHistory.shift();
      flowHistory.push(Math.max(0, v));
      if (loSparkLine && loSparkArea){
        let d = '';
        flowHistory.forEach((y, i) => {
          const px = (i / (flowHistory.length - 1)) * 300;
          const py = 110 - (y / 2.0) * 90;
          d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1);
        });
        loSparkLine.setAttribute('d', d);
        loSparkArea.setAttribute('d', d + ' L300 110 L0 110 Z');
      }
      if (loFlowNow) loFlowNow.textContent = v.toFixed(2);
    }, 800);

    startRadar();
  }
  function stopLiveOps(){
    if (loRaf) cancelAnimationFrame(loRaf);
    if (radarRaf) cancelAnimationFrame(radarRaf);
    if (loInterval) clearTimeout(loInterval);
    if (loBurnInterval) clearInterval(loBurnInterval);
    if (loFlowInterval) clearInterval(loFlowInterval);
    loRaf = null; loInterval = null; loBurnInterval = null; loFlowInterval = null;
  }

  // hook into router
  const _goView = window.goView;
  window.goView = function(name){
    _goView(name);
    if (name === 'liveops') startLiveOps();
    else stopLiveOps();
  };

  // ============ BOOT SEQUENCE ============
  const bootEl = document.getElementById('boot');
  const bootBar = document.getElementById('bootBar');
  const bootLog = document.getElementById('bootLog');
  const BOOT_STEPS = [
    { t: 0,    msg: '<b>></b> mounting schema · <span class="ok">23 streams</span>' },
    { t: 200,  msg: '<b>></b> auth · acme-corp · <span class="ok">남윤서 / admin</span>' },
    { t: 480,  msg: '<b>></b> loading employees · <span class="ok">15</span>' },
    { t: 720,  msg: '<b>></b> connecting AI · gemini-vision · <span class="ok">ready</span>' },
    { t: 980,  msg: '<b>></b> risk monitor · 5 modules · <span class="ok">armed</span>' },
    { t: 1200, msg: '<b>></b> NEXUS OS · <span class="ok">READY</span> · 1.21s' }
  ];
  if (bootEl) {
    let cleared = false;
    BOOT_STEPS.forEach(s => setTimeout(() => {
      const line = document.createElement('div'); line.innerHTML = s.msg;
      bootLog.appendChild(line);
      bootBar.style.width = (((BOOT_STEPS.indexOf(s) + 1) / BOOT_STEPS.length) * 100) + '%';
    }, s.t));
    setTimeout(() => { bootEl.classList.add('gone'); setTimeout(() => bootEl.remove(), 700); }, 1500);
  }

  // ============ TOAST ============
  const toastEl = document.getElementById('toast');
  function showToast(html){
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.remove('show'); void toastEl.offsetWidth;
    toastEl.classList.add('show');
  }

  // ============ KEYBOARD NAV ============
  const NAV_KEYS = { '1': ['dashboard','대시보드'], '2': ['payroll','급여'], '3': ['approvals','전자결재'], '4': ['risk','리스크 모니터'], '5': ['simulator','시뮬레이터'], '6': ['ask','Ask Nexus'], '7': ['liveops','Live Ops'] };
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (NAV_KEYS[e.key]) { e.preventDefault(); const [v,l]=NAV_KEYS[e.key]; window.goView(v); showToast(`<b>${e.key}</b>${l}`); }
    if (e.key.toLowerCase() === 'p') { e.preventDefault(); firePulse(); }
  });

  // ============ PULSE ============
  const pulseEl = document.getElementById('pulseSweep');
  window.firePulse = function(){
    if (!pulseEl) return;
    pulseEl.classList.remove('go'); void pulseEl.offsetWidth;
    pulseEl.classList.add('go');
    // brief panel flash
    document.querySelectorAll('.panel, .kpi, .lo-panel').forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'border-color .2s, box-shadow .3s';
        const orig = el.style.borderColor;
        el.style.borderColor = 'var(--accent)';
        el.style.boxShadow = '0 0 0 1px rgba(245,194,107,0.3)';
        setTimeout(() => { el.style.borderColor = orig; el.style.boxShadow = ''; }, 240);
      }, i * 14);
    });
    setTimeout(() => showToast('<b>PULSE</b>ALL SYSTEMS GO · 23ms'), 600);
  };

  // ============ DRAWER SYSTEM ============
  const drawer = document.getElementById('drawer');
  const drawerBack = document.getElementById('drawerBack');
  const drawerEyebrow = document.getElementById('drawerEyebrow');
  const drawerName = document.getElementById('drawerName');
  const drawerBody = document.getElementById('drawerBody');

  window.openDrawer = function(opts) {
    drawerEyebrow.textContent = opts.eyebrow || '';
    drawerName.innerHTML = opts.name || '';
    drawerBody.innerHTML = opts.body || '';
    drawer.classList.add('on');
    drawerBack.classList.add('on');
  };
  window.closeDrawer = function() {
    drawer.classList.remove('on');
    drawerBack.classList.remove('on');
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('on')) closeDrawer();
  });

  // employee card → drawer (event delegation: cards are populated later in EMPLOYEE GRID block)
  const empGridEl = document.getElementById('empGrid');
  if (empGridEl) {
    empGridEl.style.cursor = 'default';
    empGridEl.addEventListener('click', evt => {
      const card = evt.target.closest('.emp-card');
      if (!card) return;
      const cards = [...empGridEl.querySelectorAll('.emp-card')];
      const idx = cards.indexOf(card);
      const e = EMPLOYEES[idx];
      if (!e) return;
      const accruedSev = (e.salary * 1000 * 30 * (Math.random() * 3 + 1.5) / 365);
      openDrawer({
        eyebrow: `${e.id} · ${e.dep} · ${e.role}`,
        name: `${e.nm} <em>· ${DEP_LABEL[e.dep]}</em>`,
        body: `
          <div class="drawer-sec">
            <h5>고용 정보</h5>
            <div class="drawer-kv"><span class="k">입사일</span><span class="v">2022.03.14 <em>· 4.2년</em></span></div>
            <div class="drawer-kv"><span class="k">고용 형태</span><span class="v">정규직 · 풀타임</span></div>
            <div class="drawer-kv"><span class="k">소속</span><span class="v">${DEP_LABEL[e.dep]} · ${e.role}</span></div>
            <div class="drawer-kv"><span class="k">매니저</span><span class="v">남윤서</span></div>
            <div class="drawer-kv"><span class="k">근무지</span><span class="v">서울 본사 · 위워크 12F</span></div>
          </div>
          <div class="drawer-sec">
            <h5>임금 · 세후 추정</h5>
            <div class="drawer-kv"><span class="k">기본급 (월)</span><span class="v">₩${(e.salary).toLocaleString()},000</span></div>
            <div class="drawer-kv"><span class="k">통상시급</span><span class="v">₩${Math.round(e.salary * 1000 / 209).toLocaleString()}</span></div>
            <div class="drawer-kv"><span class="k">4대보험 (본인)</span><span class="v">−₩${Math.round(e.salary * 90).toLocaleString()}</span></div>
            <div class="drawer-kv"><span class="k">원천세 (간이)</span><span class="v">−₩${Math.round(e.salary * 60).toLocaleString()}</span></div>
            <div class="drawer-kv"><span class="k">실수령 추정</span><span class="v"><em>₩${(e.salary * 850).toLocaleString()}</em></span></div>
          </div>
          <div class="drawer-sec">
            <h5>이번 달 컴플라이언스</h5>
            <div class="drawer-kv"><span class="k">주 누적</span><span class="v" style="color:${e.warn ? 'var(--red)' : 'var(--text-1)'}">${e.ot52} ${e.warn ? '⚠' : ''}</span></div>
            <div class="drawer-kv"><span class="k">연차 잔여</span><span class="v" style="color:${e.leaveWarn ? 'var(--accent)' : 'var(--text-1)'}">${e.leave} ${e.leaveWarn ? '· 촉진' : ''}</span></div>
            <div class="drawer-kv"><span class="k">야간근로</span><span class="v">4h · §56 ③</span></div>
            <div class="drawer-kv"><span class="k">지각 / 결근</span><span class="v">0 / 0</span></div>
          </div>
          <div class="drawer-sec">
            <h5>퇴직급여 · 누계 적립</h5>
            <div class="drawer-kv"><span class="k">DC형 · 1/12 적립</span><span class="v"><em>₩${Math.round(accruedSev).toLocaleString()}</em></span></div>
            <div class="drawer-kv"><span class="k">평균임금 (직전 3개월)</span><span class="v">₩${Math.round(e.salary * 1000 * 3 / 92).toLocaleString()} / 일</span></div>
          </div>
        `
      });
    });
    // also style cards as pointer as they're added — handled by CSS fallback below
    const style = document.createElement('style');
    style.textContent = '#empGrid .emp-card { cursor: pointer; }';
    document.head.appendChild(style);
  }

  // journal viewer (M09 결산 → 항목 클릭)
  const JOURNALS = {
    '5월 매출 분개': [
      ['1110', '보통예금 · 우리은행', 47080000, 0],
      ['4100', '제품매출', 0, 42800000],
      ['2510', '부가세예수금', 0, 4280000]
    ],
    '매입 분개 (150건)': [
      ['8300', '지급수수료 · SaaS', 4200000, 0],
      ['8200', '소모품비 · 비품', 680000, 0],
      ['8400', '복리후생비 · 식대', 900000, 0],
      ['8500', '접대비', 1200000, 0],
      ['8100', '임차료', 3500000, 0],
      ['1350', '부가세대급금', 1130000, 0],
      ['2200', '미지급금', 0, 11610000]
    ],
    '감가상각 자동 분개': [
      ['8600', '감가상각비 · 비품', 760000, 0],
      ['8650', '감가상각비 · 차량', 880000, 0],
      ['8700', '감가상각비 · 소프트웨어', 320000, 0],
      ['1290', '감가상각누계액', 0, 1960000]
    ],
    '급여 분개': [
      ['8000', '급여 · 기본급', 58200000, 0],
      ['8010', '급여 · 제수당', 4800000, 0],
      ['8020', '4대보험 · 회사부담', 5670000, 0],
      ['2100', '예수금 · 원천세', 0, 4217200],
      ['2110', '예수금 · 4대보험 본인', 0, 5670000],
      ['1110', '보통예금', 0, 58782800]
    ]
  };
  document.querySelectorAll('.close-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const title = item.querySelector('.t')?.firstChild.textContent?.trim();
      const subtitle = item.querySelector('.t small')?.textContent || '';
      const journal = JOURNALS[title];
      if (!journal) {
        openDrawer({
          eyebrow: 'CLOSE · 작업 항목',
          name: title || '항목',
          body: `<div class="drawer-sec"><h5>설명</h5><div style="font-family:var(--mono);font-size:12px;color:var(--text-2);line-height:1.7">${subtitle}</div></div><div class="drawer-sec"><h5>상태</h5><div style="color:var(--text-3);font-family:var(--mono);font-size:12px">분개 데이터가 아직 등록되지 않은 항목입니다. 작업을 완료하면 자동 생성됩니다.</div></div>`
        });
        return;
      }
      const dTot = journal.reduce((s, r) => s + r[2], 0);
      const cTot = journal.reduce((s, r) => s + r[3], 0);
      openDrawer({
        eyebrow: `JOURNAL · ${new Date().toISOString().slice(0,10)} · auto`,
        name: `${title} <em>·</em>`,
        body: `
          <div class="drawer-sec">
            <h5>설명</h5>
            <div style="font-family:var(--mono);font-size:12px;color:var(--text-2);line-height:1.7">${subtitle}</div>
          </div>
          <div class="drawer-sec">
            <h5>차변 · 대변</h5>
            <div class="journal-line" style="color:var(--text-3);border-bottom:1px solid var(--line)"><span>계정</span><span>차변</span><span>대변</span></div>
            ${journal.map(([code, name, d, c]) => `
              <div class="journal-line">
                <span style="font-family:var(--mono);color:var(--accent)">${code}</span>
                <span class="acct">${name}</span>
                <span class="debit">${d ? '<b>₩' + d.toLocaleString() + '</b>' : '—'}</span>
                <span class="credit">${c ? '<b>₩' + c.toLocaleString() + '</b>' : '—'}</span>
              </div>`).join('').replace(/grid-template-columns: 30px 1fr 1fr/g, 'grid-template-columns: 50px 1fr 110px 110px')}
            <div class="journal-tot" style="grid-template-columns:50px 1fr 110px 110px"><span></span><span style="text-align:left">합계 · balance ${dTot===cTot ? '✓' : '⚠'}</span><span>₩${dTot.toLocaleString()}</span><span>₩${cTot.toLocaleString()}</span></div>
          </div>
          <div class="drawer-sec">
            <h5>증빙 · 첨부</h5>
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-3);line-height:1.8">JE-2026-05-${String(Math.floor(Math.random()*999)).padStart(3,'0')}.pdf · sha256 <span style="color:var(--accent)">a8f4···91c2</span></div>
          </div>
        `
      });
    });
  });

  // ============ LIVE SIDEBAR COUNTS ============
  const sidebarCounts = {
    employees:  '15',
    attendance: '2.7k',
    leave:      '4',
    expenses:   '150',
    vendors:    '24',
    assets:     '34',
    close:      '17/23',
    severance:  '10',
    yearend:    '12/15',
    audit:      '∞',
    settings:   ''
  };
  Object.entries(sidebarCounts).forEach(([k, v]) => {
    const item = document.querySelector(`.side-item[data-view="${k}"]`);
    if (!item) return;
    const ico = item.querySelector('.ico');
    let badge = item.querySelector('.badge');
    if (!badge && v) {
      badge = document.createElement('span');
      badge.className = 'badge';
      item.appendChild(badge);
    }
    if (badge && v) badge.textContent = v;
    if (badge && !v) badge.remove();
    // remove the • dot prefix that signaled "not yet built"
    if (ico) ico.style.opacity = '1';
  });

  // mark warn states
  document.querySelector('.side-item[data-view="leave"] .badge')?.classList.add('warn');
  document.querySelector('.side-item[data-view="close"] .badge')?.classList.add('warn');

  // ============ BETTER FLIP TRANSITION ============
  const _go = window.goView;
  let _busy = false;
  window.goView = function(name) {
    if (_busy) return;
    const cur = document.querySelector('.view.on');
    if (cur && cur.dataset.view === name) return;
    _busy = true;
    if (cur) {
      cur.style.transition = 'opacity .14s ease, transform .18s cubic-bezier(.22,.61,.36,1)';
      cur.style.opacity = '0';
      cur.style.transform = 'translateY(-4px) scale(.995)';
    }
    setTimeout(() => {
      _go(name);
      const next = document.querySelector('.view.on');
      if (next) {
        next.style.opacity = '0';
        next.style.transform = 'translateY(10px) scale(.995)';
        // stagger children
        const kids = next.querySelectorAll('.page-head, .panel, .kanban, .tbl, .vendor-card, .emp-card, .lv-cell, .close-section, .audit-row, .ye-dist, .ye-emp-tbl, .sev-grid, .formula-viz, .pay-detail, .set-grid, .exp-summary > div, .assets-kpis > div');
        kids.forEach((k, i) => {
          if (i > 14) return;
          k.style.opacity = '0';
          k.style.transform = 'translateY(8px)';
        });
        requestAnimationFrame(() => {
          next.style.transition = 'opacity .32s ease, transform .42s cubic-bezier(.22,.61,.36,1)';
          next.style.opacity = '1';
          next.style.transform = 'none';
          kids.forEach((k, i) => {
            if (i > 14) return;
            k.style.transition = `opacity .42s ease ${60 + i*28}ms, transform .5s cubic-bezier(.22,.61,.36,1) ${60 + i*28}ms`;
            k.style.opacity = '';
            k.style.transform = '';
          });
        });
      }
      _busy = false;
    }, 140);
  };

  // dismiss banner
  document.querySelector('.demo-banner .x')?.addEventListener('click', e => e.currentTarget.parentElement.remove());

  // ============ EMPLOYEE GRID (M02) ============
  const EMPLOYEES = [
    { id: 'EMP-001', nm: '김지원', en: 'K', dep: 'DEV',   role: '시니어 엔지니어',  salary: 5350, leave: '12/15', ot52: '49.8h/52', warn: true },
    { id: 'EMP-002', nm: '박서연', en: 'P', dep: 'DEV',   role: '시니어 엔지니어',  salary: 4870, leave: '8/15',  ot52: '38.2h/52' },
    { id: 'EMP-003', nm: '이민준', en: 'L', dep: 'DEV',   role: '미드 엔지니어',    salary: 4220, leave: '2/12',  ot52: '34.0h/52', leaveWarn: true },
    { id: 'EMP-004', nm: '정현우', en: 'J', dep: 'DEV',   role: '미드 엔지니어',    salary: 4180, leave: '9/12',  ot52: '41.4h/52' },
    { id: 'EMP-005', nm: '조태현', en: 'C', dep: 'DEV',   role: '주니어 엔지니어',  salary: 3420, leave: '11/11', ot52: '32.0h/52' },
    { id: 'EMP-006', nm: '강민서', en: 'K', dep: 'DEV',   role: '주니어 엔지니어',  salary: 3380, leave: '7/11',  ot52: '36.0h/52' },
    { id: 'EMP-007', nm: '한도윤', en: 'H', dep: 'SALES', role: '시니어 영업',      salary: 4520, leave: '5/14',  ot52: '28.4h/52' },
    { id: 'EMP-008', nm: '서지호', en: 'S', dep: 'SALES', role: '미드 영업',        salary: 3940, leave: '8/12',  ot52: '30.2h/52' },
    { id: 'EMP-009', nm: '문하늘', en: 'M', dep: 'SALES', role: '주니어 영업',      salary: 3120, leave: '9/11',  ot52: '26.8h/52' },
    { id: 'EMP-010', nm: '최유진', en: 'C', dep: 'DSGN',  role: '주니어 디자이너',  salary: 3640, leave: '3/10',  ot52: '32.0h/52', leaveWarn: true },
    { id: 'EMP-011', nm: '윤채린', en: 'Y', dep: 'DSGN',  role: '미드 디자이너',    salary: 3960, leave: '7/11',  ot52: '34.6h/52' },
    { id: 'EMP-012', nm: '남윤서', en: 'N', dep: 'OPS',   role: '경영지원 매니저',  salary: 4480, leave: '6/13',  ot52: '40.0h/52' },
    { id: 'EMP-013', nm: '송지아', en: 'S', dep: 'OPS',   role: '운영 매니저',      salary: 4180, leave: '10/15', ot52: '36.0h/52' },
    { id: 'EMP-014', nm: '임도현', en: 'I', dep: 'OPS',   role: '운영 주니어',      salary: 3260, leave: '11/11', ot52: '28.0h/52' },
    { id: 'EMP-015', nm: '백은지', en: 'B', dep: 'OPS',   role: '인사 주니어',      salary: 3280, leave: '12/12', ot52: '27.4h/52' }
  ];
  const DEP_LABEL = { DEV: '개발', SALES: '영업', DSGN: '디자인', OPS: '경영지원' };
  const empGrid = document.getElementById('empGrid');
  if (empGrid) {
    empGrid.innerHTML = EMPLOYEES.map(e => `
      <div class="emp-card" data-dep="${e.dep}">
        <div class="badges">${e.warn ? '<span class="chip warn"><i></i>52h</span>' : ''}${e.leaveWarn ? '<span class="chip pend"><i></i>연차</span>' : ''}</div>
        <div class="av">${e.nm[0]}</div>
        <div class="nm">${e.nm}<span style="font-family:var(--mono);font-size:11px;color:var(--text-3);letter-spacing:0.06em;margin-left:8px">${e.id}</span></div>
        <div class="ro"><b>${e.dep}</b>${e.role}</div>
        <div class="stats">
          <div>월 기본급<b>₩${(e.salary).toLocaleString()}K</b></div>
          <div class="${e.leaveWarn ? 'stat-warn' : ''}">연차<b>${e.leave}</b></div>
          <div class="${e.warn ? 'stat-warn' : ''}">주 누적<b>${e.ot52}</b></div>
          <div>근속<b>${(Math.random() * 3 + 1).toFixed(1)}y</b></div>
        </div>
      </div>
    `).join('');
    // dept filter
    const segBtns = document.querySelectorAll('.emp-toolbar .seg button');
    segBtns.forEach(btn => btn.addEventListener('click', () => {
      segBtns.forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const t = btn.textContent.trim();
      let f = null;
      if (t.startsWith('개발')) f = 'DEV';
      else if (t.startsWith('영업')) f = 'SALES';
      else if (t.startsWith('디자인')) f = 'DSGN';
      else if (t.startsWith('경영지원') || t.startsWith('운영')) f = 'OPS';
      document.querySelectorAll('#empGrid .emp-card').forEach(c => {
        c.style.display = (!f || c.dataset.dep === f) ? '' : 'none';
      });
    }));
    // search filter
    const search = document.querySelector('.emp-toolbar .search');
    if (search) search.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#empGrid .emp-card').forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // ============ ATTENDANCE CALENDAR (M03) ============
  const calDays = document.getElementById('calDays');
  if (calDays) {
    // May 2026: starts Fri (May 1), 31 days. Today = May 11 (Mon)
    const FIRST_DOW = 5; // Friday
    const DAYS_IN_MONTH = 31;
    const TODAY = 11;
    const EVENTS = {
      1:  { kind: 'ho', label: '근로자의 날' },
      5:  { kind: 'ho', label: '어린이날' },
      6:  { kind: 'lv', label: '강민서 연차' },
      7:  { kind: 'lv', label: '최유진 반차' },
      8:  { kind: 'ot', label: '연장 +3.2h' },
      9:  { kind: 'ot', label: '연장 +2.0h' },
      11: { kind: 'ot', label: '야간 +0.5×' },
      13: { kind: 'lv', label: '한도윤 출장연계' },
      14: { kind: 'lv', label: '한도윤' },
      15: { kind: 'ot', label: '연장 +1.4h' },
      20: { kind: 'lv', label: '이민준 신청' },
      21: { kind: 'lv', label: '이민준 신청' },
      25: { kind: 'ev', label: '급여 지급일' }
    };
    let html = '';
    // Leading empties
    for (let i = 0; i < FIRST_DOW; i++) {
      html += '<div class="cal-day out"></div>';
    }
    for (let d = 1; d <= DAYS_IN_MONTH; d++) {
      const dow = (FIRST_DOW + d - 1) % 7;
      const classes = ['cal-day'];
      if (dow === 0) classes.push('sun');
      if (dow === 6) classes.push('sat');
      if (dow === 0 || dow === 6) classes.push('weekend');
      if (d === TODAY) classes.push('today');
      const ev = EVENTS[d];
      const dots = (() => {
        if (d > TODAY) return '';
        // simulate punches: present (green) most days; some have ot/lv
        const r = [];
        if (dow !== 0 && dow !== 6 && !(ev && ev.kind === 'ho') && !(ev && ev.kind === 'lv')) {
          r.push('<i style="background:var(--green)"></i>');
          if (ev && ev.kind === 'ot') r.push('<i style="background:var(--accent)"></i>');
          if (d === 11) r.push('<i style="background:var(--red)"></i>');
        }
        return r.length ? `<div class="pile">${r.join('')}</div>` : '';
      })();
      const evHtml = ev ? `<span class="ev ${ev.kind}">${ev.label}</span>` : '';
      html += `<div class="${classes.join(' ')}"><span class="dn">${d}</span>${dots}${evHtml}</div>`;
    }
    // Trailing empties to fill last row
    const total = FIRST_DOW + DAYS_IN_MONTH;
    const trailing = (7 - (total % 7)) % 7;
    for (let i = 0; i < trailing; i++) html += '<div class="cal-day out"></div>';
    calDays.innerHTML = html;
  }

  // ============ KANBAN DRAG & DROP ============
  document.querySelectorAll('.kanban .kanban-card').forEach(card => {
    card.draggable = true;
    card.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'card'); } catch(_) {}
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('.kanban .kanban-col').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drop');
      const dragging = document.querySelector('.kanban-card.dragging');
      const after = [...col.querySelectorAll('.kanban-card:not(.dragging)')].find(c => {
        const r = c.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2;
      });
      if (!dragging) return;
      if (after) col.insertBefore(dragging, after);
      else col.appendChild(dragging);
    });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drop');
      showToast('<b>↦</b>결재 단계 이동 · audit 기록됨');
    });
  });

  // ============ AUDIT FILTERS ============
  document.querySelectorAll('.audit-chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.audit-chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    const filter = c.textContent.trim().toUpperCase();
    document.querySelectorAll('.audit-row').forEach(r => {
      if (filter === '전체') { r.style.display = ''; return; }
      const txt = r.querySelector('.act b')?.textContent || '';
      r.style.display = txt.toUpperCase().includes(filter) ? '' : 'none';
    });
  }));

  // ============ SETTINGS TABS ============
  document.querySelectorAll('.set-nav a').forEach(a => a.addEventListener('click', () => {
    document.querySelectorAll('.set-nav a').forEach(x => x.classList.remove('on'));
    a.classList.add('on');
    const panel = document.querySelector('.set-panel');
    panel.style.opacity = 0; panel.style.transform = 'translateY(8px)';
    setTimeout(() => { panel.style.transition = 'opacity .25s, transform .25s'; panel.style.opacity = 1; panel.style.transform = 'none'; }, 60);
  }));

  // ============ FLIP-LIKE VIEW TRANSITION ============
  const origGoView = window.goView;
  window.goView = function(name){
    const cur = document.querySelector('.view.on');
    if (cur && cur.dataset.view !== name) {
      cur.style.transition = 'opacity .18s ease';
      cur.style.opacity = '0.0';
    }
    setTimeout(() => {
      origGoView(name);
      const next = document.querySelector('.view.on');
      if (next) {
        next.style.opacity = '0';
        next.style.transform = 'translateY(6px)';
        requestAnimationFrame(() => {
          next.style.transition = 'opacity .28s ease, transform .28s ease';
          next.style.opacity = '1';
          next.style.transform = 'none';
        });
      }
    }, 120);
  };
})();
