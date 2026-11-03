/* ============================================================
   工单协作系统 · 交互
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = {
  view: 'inbox',
  filter: 'all',
  q: '',
  currentTicket: null,
};

/* ---------- 工具 ---------- */
const pad = n => String(n).padStart(2, '0');
function timeAgo(d) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时前';
  return Math.floor(h / 24) + ' 天前';
}
function fmt(d) {
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const cust = id => CUSTOMERS.find(c => c.id === id);
const statusOf = k => STATUSES.find(s => s.key === k);
const priClass = p => ({ 紧急: 'urgent', 高: 'high', 中: 'mid', 低: 'low' }[p] || 'mid');

/* ---------- 涟漪 ---------- */
function ripple(el, e) {
  const r = el.getBoundingClientRect();
  const d = Math.max(r.width, r.height);
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = d + 'px';
  s.style.left = (e.clientX - r.left - d / 2) + 'px';
  s.style.top = (e.clientY - r.top - d / 2) + 'px';
  el.appendChild(s);
  setTimeout(() => s.remove(), 640);
}

/* ---------- 数字滚动 ---------- */
function countUp(el, to, dur = 900) {
  const from = 0, t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- toast ---------- */
function toast(msg) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i></i><span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

/* ---------- 渲染：工单列表 ---------- */
function filtered() {
  let list = [...TICKETS];
  if (state.filter === 'urgent') list = list.filter(t => t.priority === '紧急');
  if (state.filter === 'mine') list = list.filter(t => t.owner === '方哲');
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      cust(t.customer).name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q)
    );
  }
  // 按最后活动时间倒序：列表右侧显示的就是这个时间，
  // 按状态或优先级排会让时间列来回跳，看起来像出了 bug。
  return list.sort((a, b) => b.updated - a.updated);
}

function renderList() {
  const box = $('#ticketList');
  const list = filtered();
  box.innerHTML = '';
  $('#listEmpty').hidden = list.length > 0;

  list.forEach((t, i) => {
    const c = cust(t.customer);
    const s = statusOf(t.status);
    const el = document.createElement('article');
    el.className = 'ticket';
    el.style.animationDelay = (i * 42) + 'ms';
    el.dataset.id = t.id;
    el.innerHTML = `
      <div class="t-ava">${c.short}</div>
      <div class="t-main">
        <div class="t-title">${t.title}</div>
        <div class="t-meta">
          <span class="t-id">${t.id}</span>
          <span class="dot"></span>
          <span>${c.name}</span>
          <span class="dot"></span>
          <span>${t.type}</span>
          <span class="dot"></span>
          <span>${t.owner || '未分配'}</span>
        </div>
      </div>
      <div class="t-right">
        <span class="pill ${priClass(t.priority)}">${t.priority}</span>
        <span class="status st-${t.status}"><i></i>${s.label}</span>
        <span class="t-time">${timeAgo(t.updated)}</span>
      </div>`;
    /* 光斑跟随 */
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    el.addEventListener('mouseenter', () => Sfx.hover());
    el.addEventListener('click', e => { ripple(el, e); Sfx.open(); openDrawer(t); });
    box.appendChild(el);
  });
}

/* ---------- 渲染：看板 ---------- */
function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  STATUSES.forEach(s => {
    const items = TICKETS.filter(t => t.status === s.key);
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.status = s.key;
    col.innerHTML = `
      <div class="col-head">
        <div class="col-title"><i style="background:${s.color}"></i>${s.label}</div>
        <span class="col-count">${items.length}</span>
      </div>
      <div class="col-body"></div>`;
    const body = $('.col-body', col);
    items.forEach(t => {
      const c = cust(t.customer);
      const card = document.createElement('div');
      card.className = 'kcard';
      card.draggable = true;
      card.dataset.id = t.id;
      card.innerHTML = `
        <div class="kcard-title">${t.title}</div>
        <div class="kcard-foot">
          <span>${c.short} · ${t.owner || '未分配'}</span>
          <span class="kcard-tags"><span class="pill ${priClass(t.priority)}">${t.priority}</span></span>
        </div>`;
      card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
        Sfx.tap();
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => { if (!card.classList.contains('dragging')) { Sfx.open(); openDrawer(t); } });
      body.appendChild(card);
    });

    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const t = TICKETS.find(x => x.id === id);
      if (!t || t.status === s.key) return;
      t.status = s.key;
      t.updated = new Date();
      t.timeline.push({ t: new Date(), title: `状态变更为「${s.label}」`, meta: '看板拖拽' });
      Sfx.drop();
      toast(`${t.id} 已移到「${s.label}」`);
      renderBoard();
      renderList();
    });
    board.appendChild(col);
  });
}

/* ---------- 渲染：数据 ---------- */
function renderKpis() {
  const box = $('#kpis');
  box.innerHTML = '';
  KPIS.forEach((k, i) => {
    const el = document.createElement('div');
    el.className = 'kpi';
    const isPct = k.unit === '%';
    el.innerHTML = `
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-val"><span data-v="${k.value}">0</span><small>${k.unit}</small></div>
      <div class="kpi-delta ${k.dir}">${k.dir === 'up' ? '▲' : '▼'} ${Math.abs(k.delta)}${isPct ? ' pt' : ''} <span style="color:var(--muted)">${k.hint}</span></div>`;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    box.appendChild(el);
    const v = $('[data-v]', el);
    setTimeout(() => {
      if (isPct) {
        const t0 = performance.now();
        (function s(t) {
          const p = Math.min(1, (t - t0) / 900);
          v.textContent = (k.value * (1 - Math.pow(1 - p, 3))).toFixed(1);
          if (p < 1) requestAnimationFrame(s);
        })(t0);
      } else countUp(v, k.value);
    }, 120 + i * 70);
  });
}

/* ---------- 图表 tooltip ----------
 * 两个图共用一个浮层。定位相对 .card，靠右时自动翻到鼠标左边。 */
function ensureTip(host) {
  let tip = host.querySelector('.chart-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    host.appendChild(tip);
  }
  return tip;
}

function placeTip(tip, host, ev) {
  const r = host.getBoundingClientRect();
  const x = ev.clientX - r.left;
  const y = ev.clientY - r.top;
  const w = tip.offsetWidth || 140;
  const flip = x + w + 18 > r.width;
  tip.style.left = (flip ? x - w - 12 : x + 14) + 'px';
  tip.style.top = Math.max(6, y - tip.offsetHeight - 12) + 'px';
}

function renderBar() {
  const svg = $('#chartBar');
  const host = svg.closest('.card');
  const W = 560, Hh = 220, padL = 32, padB = 26, padT = 10;
  const n = WEEK.labels.length;
  const maxV = Math.max(...WEEK.created, ...WEEK.solved) * 1.15;
  const gw = (W - padL) / n;
  const bw = gw * 0.28;
  const base = Hh - padB;

  let out = '';
  for (let i = 0; i <= 4; i++) {
    const y = padT + (Hh - padT - padB) * (i / 4);
    const val = Math.round(maxV * (1 - i / 4));
    out += `<line x1="${padL}" y1="${y}" x2="${W}" y2="${y}" stroke="currentColor" stroke-opacity=".07" stroke-dasharray="3 5"/>`;
    out += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity=".32">${val}</text>`;
  }

  WEEK.labels.forEach((lb, i) => {
    const cx = padL + gw * i + gw / 2;
    const h1 = (WEEK.created[i] / maxV) * (Hh - padT - padB);
    const h2 = (WEEK.solved[i] / maxV) * (Hh - padT - padB);
    out += `<g class="bcol" data-i="${i}">
      <rect class="bar" x="${cx - bw - 2}" y="${base - h1}" width="${bw}" height="${h1}" rx="3" fill="url(#gA)"/>
      <rect class="bar" x="${cx + 2}" y="${base - h2}" width="${bw}" height="${h2}" rx="3" fill="url(#gB)"/>
      <rect class="hit" x="${padL + gw * i}" y="${padT}" width="${gw}" height="${Hh - padT - padB}" fill="transparent"/>
    </g>`;
    out += `<text x="${cx}" y="${Hh - 8}" text-anchor="middle" font-size="10.5" fill="currentColor" fill-opacity=".42">${lb}</text>`;
  });

  svg.innerHTML = `
    <defs>
      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(224,161,92,.95)"/><stop offset="100%" stop-color="rgba(224,161,92,.18)"/>
      </linearGradient>
      <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(150,157,166,.6)"/><stop offset="100%" stop-color="rgba(150,157,166,.12)"/>
      </linearGradient>
    </defs>${out}`;
  svg.style.color = getComputedStyle(document.body).color;

  const tip = ensureTip(host);
  const cols = $$('.bcol', svg);

  if (!svg.dataset.wired) {
    svg.dataset.wired = '1';

    svg.addEventListener('pointermove', e => {
      const hit = e.target.closest('.hit');
      if (!hit) return;
      const i = +hit.parentNode.dataset.i;
      const created = WEEK.created[i];
      const solved = WEEK.solved[i];
      const rate = Math.round((solved / created) * 100);

      cols.forEach(c => c.classList.toggle('on', +c.dataset.i === i));
      svg.classList.add('has-focus');

      tip.innerHTML = `
        <div class="tip-head">${WEEK.labels[i]}</div>
        <div class="tip-row"><i style="background:#E0A15C"></i><span>新增</span><b>${created}</b></div>
        <div class="tip-row"><i style="background:#969DA6"></i><span>解决</span><b>${solved}</b></div>
        <div class="tip-foot">当日完成率 <b>${rate}%</b></div>`;
      tip.classList.add('show');
      placeTip(tip, host, e);
    });

    svg.addEventListener('pointerleave', () => {
      tip.classList.remove('show');
      svg.classList.remove('has-focus');
      cols.forEach(c => c.classList.remove('on'));
    });
  }
}

/* ---------- 渲染：问题类型环形图 ---------- */
function renderDonut() {
  const svg = $('#chartDonut');
  const total = TYPES.reduce((a, b) => a + b.value, 0);
  const R = 78, r = 52, cx = 100, cy = 100;
  const gap = 0.018;
  let start = -Math.PI / 2, out = '';

  TYPES.forEach((t, i) => {
    const ang = (t.value / total) * Math.PI * 2;
    const a0 = start + gap / 2;
    const a1 = start + ang - gap / 2;
    const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    const [x1, y1] = p(R, a0), [x2, y2] = p(R, a1);
    const [x3, y3] = p(r, a1), [x4, y4] = p(r, a0);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    out += `<path class="slice" data-i="${i}" data-name="${t.name}" data-val="${t.value}"
      d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r} ${r} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z"
      fill="${t.color}"
      style="animation:donutIn .7s var(--ease) ${i * 80}ms backwards"/>`;
    start += ang;
  });

  out += `<g class="donut-center">
    <text class="dc-num" x="100" y="97" text-anchor="middle" font-size="25" font-weight="700" fill="currentColor">${total}</text>
    <text class="dc-label" x="100" y="117" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".42">本月工单</text>
  </g>`;

  svg.innerHTML = out;
  svg.style.color = getComputedStyle(document.body).color;

  const num = $('.dc-num', svg);
  const label = $('.dc-label', svg);
  const slices = $$('.slice', svg);
  let timer = 0;

  function setCenter(n, lb) {
    clearTimeout(timer);
    num.style.opacity = '0';
    label.style.opacity = '0';
    timer = setTimeout(() => {
      num.textContent = n;
      label.textContent = lb;
      num.style.opacity = '1';
      label.style.opacity = '1';
    }, 90);
  }

  function focus(i) {
    slices.forEach(sl => sl.classList.toggle('on', +sl.dataset.i === i));
    svg.classList.toggle('has-focus', i >= 0);
    $$('#donutLegend li').forEach(x => x.classList.toggle('on', +x.dataset.i === i));
    if (i < 0) { setCenter(total, '本月工单'); return; }
    const t = TYPES[i];
    setCenter(t.value, t.name + ' · ' + Math.round(t.value / total * 100) + '%');
  }

  slices.forEach(sl => {
    sl.addEventListener('pointerenter', () => focus(+sl.dataset.i));
  });
  svg.addEventListener('pointerleave', () => focus(-1));

  $('#donutLegend').innerHTML = TYPES.map((t, i) =>
    `<li data-i="${i}"><i style="background:${t.color}"></i>${t.name}<b>${Math.round(t.value / total * 100)}%</b></li>`
  ).join('');

  $$('#donutLegend li').forEach(li => {
    li.addEventListener('pointerenter', () => focus(+li.dataset.i));
    li.addEventListener('pointerleave', () => focus(-1));
  });
}

/* ---------- 渲染：处理人负载 ---------- */
function renderLoad() {
  const box = $('#loadList');
  const max = Math.max(...LOAD.map(x => x.n));
  box.innerHTML = LOAD.map((x, i) => `
    <li>
      <span class="who">${x.who}</span>
      <span class="track"><span class="fill" style="width:${(x.n / max * 100).toFixed(0)}%;
        background:linear-gradient(90deg,rgba(${x.color},.45),rgba(${x.color},.95));
        animation-delay:${i * 80}ms"></span></span>
      <span class="val">${x.n}</span>
    </li>`).join('');
}

/* ---------- 渲染：响应时长折线 ---------- */
function renderLine() {
  const svg = $('#chartLine');
  const W = 520, Hh = 200, padL = 34, padB = 24, padT = 12;
  const maxV = Math.max(...RESP) * 1.25;
  const n = RESP.length;
  const stepX = (W - padL - 10) / (n - 1);
  const y = v => padT + (Hh - padT - padB) * (1 - v / maxV);
  const pts = RESP.map((v, i) => [padL + i * stepX, y(v)]);

  /* 平滑曲线 */
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const cx = (x1 + x2) / 2;
    d += ` C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
  }
  const area = d + ` L${pts[n - 1][0]} ${Hh - padB} L${pts[0][0]} ${Hh - padB} Z`;

  let grid = '';
  for (let i = 0; i <= 3; i++) {
    const yy = padT + (Hh - padT - padB) * (i / 3);
    const val = Math.round(maxV * (1 - i / 3));
    grid += `<line x1="${padL}" y1="${yy}" x2="${W}" y2="${yy}" stroke="currentColor" stroke-opacity=".07" stroke-dasharray="3 5"/>`;
    grid += `<text x="${padL - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity=".32">${val}</text>`;
  }
  const dots = pts.map(([px, py], i) =>
    `<circle cx="${px}" cy="${py}" r="3.2" fill="rgb(224,161,92)" stroke="var(--bg)" stroke-width="2">
       <title>${WEEK.labels[i]} ${RESP[i]} 分钟</title></circle>`).join('');
  const labels = WEEK.labels.map((lb, i) =>
    `<text x="${padL + i * stepX}" y="${Hh - 7}" text-anchor="middle" font-size="10.5" fill="currentColor" fill-opacity=".42">${lb}</text>`).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(224,161,92,.3)"/>
        <stop offset="100%" stop-color="rgba(224,161,92,0)"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#gLine)" style="animation:fadeIn .9s var(--ease)"/>
    <path d="${d}" fill="none" stroke="rgb(224,161,92)" stroke-width="2" stroke-linecap="round"
      style="stroke-dasharray:1400;stroke-dashoffset:1400;animation:drawLine 1.4s var(--ease) forwards"/>
    ${dots}${labels}`;
  svg.style.color = getComputedStyle(document.body).color;
}

/* ---------- 渲染：客户 ---------- */
function renderCustomers() {
  const box = $('#custGrid');
  box.innerHTML = '';
  CUSTOMERS.forEach(c => {
    const all = c.total || ticketCountByCustomer(c.id);
    const open = openCountByCustomer(c.id);
    const latest = TICKETS.filter(t => t.customer === c.id)
      .sort((a, b) => b.updated - a.updated)[0];
    const el = document.createElement('div');
    el.className = 'cust';
    el.innerHTML = `
      <div class="cust-top">
        <div class="cust-logo">${c.short}</div>
        <div style="flex:1;min-width:0">
          <div class="cust-name">${c.name}</div>
          <div class="cust-sub">${c.industry} · ${c.scale}</div>
        </div>
        <span class="cust-health h-${c.health}">${HEALTH_TXT[c.health]}</span>
      </div>
      <div class="cust-stats">
        <div class="cust-stat"><span>累计工单</span><b>${all}</b></div>
        <div class="cust-stat"><span>未闭环</span><b>${open}</b></div>
        <div class="cust-stat"><span>对接人</span><b style="font-size:13px;font-weight:600">${c.contact}</b><em>${c.role}</em></div>
      </div>
      ${latest ? `<div class="cust-last">
        <span class="t-id" style="color:var(--muted)">${latest.id}</span>
        <span>${latest.title}</span>
      </div>` : ''}`;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    el.addEventListener('click', () => {
      Sfx.nav();
      openCustomer(c.id);
    });
    box.appendChild(el);
  });
}

/* ---------- 客户详情 ----------
 * 从工单抽屉点客户名进来，或者在客户页点卡片进来。
 * 这里列出该客户的全部工单，点任意一条回到工单详情，形成往返。 */
function openCustomer(cid) {
  const c = cust(cid);
  const list = TICKETS.filter(t => t.customer === cid).sort((a, b) => b.updated - a.updated);
  const openList = list.filter(t => t.status !== 'done');
  const monthNew = list.filter(t => (now - new Date(t.created)) < 30 * 24 * H).length;

  // 这家客户最常出什么问题
  const byType = {};
  list.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1; });
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const topPct = top ? Math.round(top[1] / list.length * 100) : 0;

  const months = Math.max(1, Math.round((now - new Date(c.since + '-01')) / (30 * 24 * H)));

  $('#drawerInner').innerHTML = `
    <div class="d-head-sticky">
      <div class="d-head">
        <div class="d-title">${c.name}</div>
        <button class="icon-btn sm d-close" id="dClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="d-sub">
        <span>${c.industry}</span><span>·</span><span>${c.scale}</span><span>·</span>
        <span>${c.since} 起合作 ${months} 个月</span>
      </div>
    </div>

    <div class="d-actions">
      <button class="btn-primary" data-act="filter">在列表里筛选</button>
      <button class="btn-ghost" data-act="newticket">为该客户建单</button>
    </div>

    <div class="d-section">
      <h4>服务概况</h4>
      <div class="d-grid">
        <div class="d-item"><span>历史工单</span><b>${c.total}</b></div>
        <div class="d-item"><span>未闭环</span><b>${openList.length}</b></div>
        <div class="d-item"><span>近 30 天新增</span><b>${monthNew}</b></div>
        <div class="d-item"><span>健康度</span><b><span class="cust-health h-${c.health}">${HEALTH_TXT[c.health]}</span></b></div>
        <div class="d-item"><span>月均工单</span><b>${(c.total / months).toFixed(1)}</b></div>
        <div class="d-item"><span>最常见问题</span><b>${top ? top[0] + ' ' + topPct + '%' : '—'}</b></div>
      </div>
    </div>

    <div class="d-section">
      <h4>对接人</h4>
      <div class="contact-card">
        <div class="cc-ava">${c.contact.slice(0, 1)}</div>
        <div class="cc-main">
          <div class="cc-name">${c.contact}<span>${c.role}</span></div>
          <div class="cc-phone">${c.phone}</div>
        </div>
        <button class="icon-btn sm" data-act="call" title="拨号">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
        </button>
      </div>
    </div>

    <div class="d-section">
      <h4>工单记录（${list.length}）</h4>
      <div class="d-list">
        ${list.map(t => {
          const st = statusOf(t.status);
          return `<a class="dl-row" data-ticket="${t.id}">
            <span class="dl-dot st-${t.status}"><i></i></span>
            <span class="dl-main">
              <span class="dl-title">${t.title}</span>
              <span class="dl-meta">${t.id} · ${st.label} · ${timeAgo(t.updated)}</span>
            </span>
            <span class="pill ${priClass(t.priority)}">${t.priority}</span>
          </a>`;
        }).join('')}
      </div>
    </div>`;

  $('#drawer').classList.add('open');
  $('#drawerMask').classList.add('show');

  $('#dClose').addEventListener('click', closeDrawer);

  $$('#drawerInner [data-act]').forEach(b => {
    b.addEventListener('click', e => {
      ripple(b, e);
      Sfx.tap();
      const act = b.dataset.act;
      if (act === 'filter') {
        closeDrawer();
        switchView('inbox');
        $('#searchInput').value = c.name;
        renderList();
        toast(`已筛选：${c.name}`);
      }
      if (act === 'newticket') {
        closeDrawer();
        openModal();
        $('#fCustomer').value = c.id;
      }
      if (act === 'call') toast(`拨号 ${c.phone}`);
    });
  });
}

/* ---------- 抽屉 ---------- */
function openDrawer(t) {
  state.currentTicket = t;
  const c = cust(t.customer);
  const s = statusOf(t.status);
  // 关联工单：同客户权重 2，同类型权重 1，取前三条
  const related = TICKETS
    .filter(x => x.id !== t.id && (x.customer === t.customer || x.type === t.type))
    .sort((a, b) => {
      const wa = (a.customer === t.customer ? 2 : 0) + (a.type === t.type ? 1 : 0);
      const wb = (b.customer === t.customer ? 2 : 0) + (b.type === t.type ? 1 : 0);
      return wb - wa || b.updated - a.updated;
    })
    .slice(0, 3);

  $('#drawerInner').innerHTML = `
    <div class="d-head-sticky">
      <div class="d-head">
        <div class="d-title">${t.title}</div>
        <button class="icon-btn sm d-close" id="dClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="d-sub">
        <span class="t-id">${t.id}</span><span>·</span>
        <a class="d-link" data-customer="${c.id}">${c.name}</a><span>·</span>
        <span>${timeAgo(t.created)}提交</span>
      </div>
    </div>
    <div class="d-actions">
      <button class="btn-primary" data-act="advance">推进状态</button>
      <button class="btn-ghost" data-act="assign">${t.owner ? '转派' : '认领'}</button>
      <button class="btn-ghost" data-act="ai">AI 建议回复</button>
    </div>

    <div class="d-section">
      <h4>工单信息</h4>
      <div class="d-grid">
        <div class="d-item"><span>优先级</span><b><span class="pill ${priClass(t.priority)}">${t.priority}</span></b></div>
        <div class="d-item"><span>状态</span><b>${s.label}</b></div>
        <div class="d-item"><span>类型</span><b><a class="d-link" data-type="${t.type}">${t.type}</a></b></div>
        <div class="d-item"><span>处理人</span><b>${t.owner ? `<a class="d-link" data-owner="${t.owner}">${t.owner}</a>` : '未分配'}</b></div>
        <div class="d-item"><span>SLA</span><b style="color:${t.sla.includes('超时') ? '#E8836F' : 'inherit'}">${t.sla}</b></div>
        <div class="d-item"><span>最近更新</span><b>${fmt(t.updated)}</b></div>
      </div>
    </div>

    <div class="d-section">
      <h4>问题描述</h4>
      <div class="d-desc">${t.desc}</div>
    </div>

    <div class="d-section">
      <h4>处理记录</h4>
      <div class="timeline">
        ${t.timeline.slice().reverse().map((x, i) => `
          <div class="tl-item ${i === t.timeline.length - 1 ? '' : 'plain'}">
            <div class="tl-t">${x.title}</div>
            <div class="tl-m">${fmt(x.t)} · ${x.meta}</div>
          </div>`).join('')}
      </div>
    </div>

    ${related.length ? `
    <div class="d-section">
      <h4>相关工单</h4>
      <div class="d-list">
        ${related.map(x => {
          const xc = cust(x.customer);
          const why = x.customer === t.customer ? '同一客户' : '同一类型';
          return `<a class="dl-row" data-ticket="${x.id}">
            <span class="dl-id">${x.id}</span>
            <span class="dl-main">${x.title}</span>
            <span class="dl-why">${why}</span>
          </a>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="d-section">
      <h4>回复客户</h4>
      <div class="reply">
        <input id="replyInput" type="text" placeholder="输入回复内容，回车发送">
      </div>
    </div>`;

  $('#drawer').classList.add('open');
  $('#drawerMask').classList.add('show');

  $('#dClose').addEventListener('click', closeDrawer);

  // 抽屉内的所有跳转走事件委托，避免每次重渲染都重新绑一遍
  const inner = $('#drawerInner');
  if (!inner.dataset.wired) {
    inner.dataset.wired = '1';
    inner.addEventListener('click', e => {
      const toCustomer = e.target.closest('[data-customer]');
      if (toCustomer) { Sfx.nav(); openCustomer(toCustomer.dataset.customer); return; }
      const toTicket = e.target.closest('[data-ticket]');
      if (toTicket) {
        const x = TICKETS.find(k => k.id === toTicket.dataset.ticket);
        if (x) { Sfx.nav(); openDrawer(x); }
        return;
      }
      const toType = e.target.closest('[data-type]');
      if (toType) {
        Sfx.nav(); closeDrawer();
        switchView('inbox');
        $('#searchInput').value = toType.dataset.type;
        renderList();
        toast(`已筛选：${toType.dataset.type}`);
        return;
      }
      const toOwner = e.target.closest('[data-owner]');
      if (toOwner) {
        Sfx.nav(); closeDrawer();
        switchView('insight');
        toast(`${toOwner.dataset.owner} 的本周负载见下方`);
      }
    });
  }

  $$('#drawerInner [data-act]').forEach(b => {
    b.addEventListener('click', e => {
      ripple(b, e);
      Sfx.tap();
      const act = b.dataset.act;
      if (act === 'advance') {
        const idx = STATUSES.findIndex(x => x.key === t.status);
        const next = STATUSES[(idx + 1) % STATUSES.length];
        t.status = next.key;
        t.updated = new Date();
        t.timeline.push({ t: new Date(), title: `状态变更为「${next.label}」`, meta: '详情页操作' });
        Sfx.success();
        toast(`${t.id} → ${next.label}`);
        openDrawer(t);
        renderList(); renderBoard();
      }
      if (act === 'assign') {
        t.owner = t.owner === '方哲' ? '李文博' : '方哲';
        t.timeline.push({ t: new Date(), title: `处理人变更为 ${t.owner}`, meta: '详情页操作' });
        Sfx.tap();
        toast(`已分派给 ${t.owner}`);
        openDrawer(t);
        renderList(); renderBoard();
      }
      if (act === 'ai') {
        const box = $('#drawerInner .reply');
        if (box && !$('#aiDraft')) {
          const draft = document.createElement('div');
          draft.id = 'aiDraft';
          draft.className = 'd-desc';
          draft.style.marginTop = '8px';
          draft.style.borderColor = 'rgba(224,161,92,.32)';
          const d = aiDraft(t);
          draft.innerHTML = `<b style="color:var(--accent-c)">AI 建议回复</b>${d.from ? `<span class="ai-src">依据 ${d.from} · 相似度 ${d.pct}%</span>` : '<span class="ai-src">无相近工单，通用模板</span>'}<br>${esc(d.text)}`;
          box.appendChild(draft);
          Sfx.success();
          toast('已生成回复草稿，可修改后发送');
        }
      }
    });
  });

  const ri = $('#replyInput');
  ri.addEventListener('keydown', e => {
    if (e.key === 'Enter' && ri.value.trim()) {
      t.timeline.push({ t: new Date(), title: '回复客户：' + ri.value.trim().slice(0, 24), meta: '工单详情' });
      t.updated = new Date();
      ri.value = '';
      Sfx.success();
      toast('回复已发送');
      openDrawer(t);
      renderList();
    }
  });
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawerMask').classList.remove('show');
  Sfx.close();
}

/* ---------- 视图切换 ---------- */
function switchView(name) {
  if (state.view === name) return;
  state.view = name;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $('#view-' + name);
  /* 强制重排，让动画重跑 */
  void target.offsetWidth;
  target.classList.add('active');
  $('.crumb-now').textContent = { inbox: '工单', board: '看板', insight: '数据', customers: '客户' }[name];

  if (name === 'insight') { renderKpis(); renderBar(); renderDonut(); renderLoad(); renderLine(); }
  if (name === 'board') renderBoard();
  if (name === 'customers') renderCustomers();
  if (name === 'inbox') renderList();
  Sfx.nav();
}

/* ---------- 新建工单 ---------- */
function openModal() {
  const sel = $('#fCustomer');
  sel.innerHTML = CUSTOMERS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#modalMask').classList.add('show');
  setTimeout(() => $('#fTitle').focus(), 260);
  Sfx.open();
}

/* 标题录入时实时查相似历史工单：问题可能已经解决过，
 * 提示一眼，避免同一故障建两次单 */
function renderSimilarHint() {
  const hint = $('#similarHint');
  if (!hint) return;
  const text = $('#fTitle').value.trim();
  if (text.length < 4) { hint.hidden = true; return; }
  const hits = AITickets.similar(text, null, 2);
  if (!hits.length || hits[0].score < 0.08) { hint.hidden = true; return; }
  const st = { new: '待分配', doing: '处理中', wait: '待确认', done: '已解决' };
  hint.innerHTML = '历史相似：' + hits.map(h =>
    `<span data-sid="${h.ticket.id}">${h.ticket.id} ${st[h.ticket.status]} · ${esc(h.ticket.title.slice(0, 18))}（${Math.round(h.score * 100)}%）</span>`
  ).join('');
  hint.hidden = false;
}
function closeModal() {
  $('#modalMask').classList.remove('show');
  Sfx.close();
}
function submitTicket() {
  const title = $('#fTitle').value.trim();
  if (!title) { Sfx.error(); toast('请填写问题标题'); $('#fTitle').focus(); return; }
  const t = {
    id: 'TK-' + (2042 + Math.floor(Math.random() * 60)),
    customer: $('#fCustomer').value,
    status: 'new',
    priority: $('#fPriority').value,
    type: $('#fType').value,
    title,
    desc: $('#fDesc').value.trim() || '（客户未填写详细描述）',
    owner: null,
    created: new Date(),
    updated: new Date(),
    sla: '待分派',
    timeline: [{ t: new Date(), title: '创建工单', meta: '方哲' }],
  };
  TICKETS.unshift(t);
  AITickets.build(TICKETS);
  $('#fTitle').value = ''; $('#fDesc').value = '';
  const hint = $('#similarHint'); if (hint) hint.hidden = true;
  closeModal();
  Sfx.success();
  toast(`${t.id} 已创建`);
  switchView('inbox');
  renderList();
  $('#badge-inbox').textContent = TICKETS.filter(x => x.status === 'new').length;
}

/* ---------- 初始化 ---------- */
function init() {
  /* 侧栏折叠 */
  $('#railToggle').addEventListener('click', e => {
    ripple($('#railToggle'), e);
    $('#rail').classList.toggle('collapsed');
    Sfx.tap();
  });

  /* 导航 */
  $$('.nav-item').forEach(b => {
    b.addEventListener('click', e => {
      ripple(b, e);
      switchView(b.dataset.view);
    });
  });

  /* 筛选分段控件 */
  const seg = $('#filterSeg');
  function moveGlider(btn) {
    const g = $('.seg-glider', seg);
    g.style.width = btn.offsetWidth + 'px';
    g.style.transform = `translateX(${btn.offsetLeft - 3}px)`;
  }
  $$('.seg-btn', seg).forEach(b => {
    b.addEventListener('click', () => {
      $$('.seg-btn', seg).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.filter = b.dataset.filter;
      moveGlider(b);
      Sfx.tap();
      renderList();
    });
  });
  requestAnimationFrame(() => moveGlider($('.seg-btn.active', seg)));

  /* 搜索 */
  let st;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(st);
    const v = e.target.value.trim();
    st = setTimeout(() => {
      state.q = v;
      if (state.view !== 'inbox') switchView('inbox');
      renderList();
    }, 160);
  });

  /* 主题 */
  $('#themeToggle').addEventListener('click', e => {
    ripple($('#themeToggle'), e);
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
    if (state.view === 'insight') { renderBar(); renderDonut(); }
    Sfx.tap();
    toast(cur === 'light' ? '已切换到深色' : '已切换到浅色');
  });
  document.documentElement.setAttribute('data-theme', 'dark');

  /* AI：建相似度索引，标题录入时实时提示 */
  AITickets.build(TICKETS);
  $('#fTitle').addEventListener('input', renderSimilarHint);

  /* 音效开关 */
  $('#soundToggle').addEventListener('click', e => {
    ripple($('#soundToggle'), e);
    Sfx.enabled = !Sfx.enabled;
    $('#soundToggle').classList.toggle('off', !Sfx.enabled);
    $('#soundToggle').dataset.tip = Sfx.enabled ? '音效开' : '音效关';
    if (Sfx.enabled) Sfx.tap();
    toast(Sfx.enabled ? '音效已开启' : '音效已关闭');
  });

  /* 新建 */
  $('#newTicket').addEventListener('click', e => { ripple($('#newTicket'), e); openModal(); });
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  $('#modalSubmit').addEventListener('click', submitTicket);
  $('#modalMask').addEventListener('click', e => { if (e.target.id === 'modalMask') closeModal(); });
  $('#fTitle').addEventListener('keydown', e => { if (e.key === 'Enter') submitTicket(); });

  /* 抽屉遮罩 */
  $('#drawerMask').addEventListener('click', closeDrawer);

  /* 键盘 */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#searchInput').focus();
      Sfx.tap();
    }
    if (e.key === 'Escape') {
      if ($('#modalMask').classList.contains('show')) closeModal();
      else if ($('#drawer').classList.contains('open')) closeDrawer();
    }
  });

  /* 首次渲染 */
  renderList();
  $$('.num').forEach(el => countUp(el, +el.dataset.count, 1100));

  /* 首屏呼吸提示 */
  setTimeout(() => toast('按 ⌘K 搜索，回车发送回复'), 900);
}

document.addEventListener('DOMContentLoaded', init);
