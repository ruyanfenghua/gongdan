/* effects.js
 * 四个效果，源码抄自 DavidHDev/react-bits，去掉 React 依赖改成原生。
 *   StarBorder   边缘光点沿轮廓跑  (Animations/StarBorder)
 *   Magnet       指针弹簧磁吸      (Animations/Magnet)
 *   ClickSpark   点击火花          (Animations/ClickSpark)
 *   Spotlight    指针聚光坐标      (Components/SpotlightCard)
 * 参数一律按原版默认值，只把回调式写法换成命令式。
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============================================================
   * 1. StarBorder —— 沿圆角矩形轮廓跑一个带拖尾的光点
   * 几何：把轮廓拆成 4 条直边 + 4 段圆弧，按弧长参数化。
   * ========================================================== */
  function StarBorder(canvas, options) {
    var opt = options || {};
    var BLEED = 18;                 // 画布外扩，光晕不被裁
    var color = opt.color || '224,161,92';
    var duration = opt.duration || 4.2;   // 跑完一圈的秒数
    var trailLength = opt.trailLength || 0.26;
    var thickness = opt.thickness || 1;
    var radius = opt.radius || 8;
    var glow = opt.glow === undefined ? 0.6 : opt.glow;

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var W = 0, H = 0, dpr = 1;
    var shape = null;
    var phase = 0;
    var velocity = 0;
    var last = 0;
    var raf = 0;
    var hover = false;
    var lap = -1;
    var visible = true;
    var alive = true;
    var LAP_TIME = 0.9;

    function wrap(v, total) { return ((v % total) + total) % total; }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; }

    // 生成段落表：每段有起点、方向或圆心、弧长
    function outline(w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      var across = Math.max(0, w - 2 * r);
      var down = Math.max(0, h - 2 * r);
      var arc = Math.PI * r / 2;
      var segs = [
        { len: across, kind: 'line', x: r, y: 0, dx: 1, dy: 0 },
        { len: arc, kind: 'arc', cx: w - r, cy: r, base: -Math.PI / 2 },
        { len: down, kind: 'line', x: w, y: r, dx: 0, dy: 1 },
        { len: arc, kind: 'arc', cx: w - r, cy: h - r, base: 0 },
        { len: across, kind: 'line', x: w - r, y: h, dx: -1, dy: 0 },
        { len: arc, kind: 'arc', cx: r, cy: h - r, base: Math.PI / 2 },
        { len: down, kind: 'line', x: 0, y: h - r, dx: 0, dy: -1 },
        { len: arc, kind: 'arc', cx: r, cy: r, base: Math.PI }
      ];
      var total = 0;
      for (var i = 0; i < segs.length; i++) total += segs[i].len;
      return { segs: segs, total: Math.max(1, total) };
    }

    function pointAt(s) {
      s = wrap(s, shape.total);
      var segs = shape.segs;
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        if (seg.len <= 0) continue;
        if (s <= seg.len) {
          if (seg.kind === 'line') {
            return { x: seg.x + seg.dx * s, y: seg.y + seg.dy * s };
          }
          var a = seg.base + s / (seg.len / (Math.PI / 2));
          return { x: seg.cx + Math.cos(a) * radius, y: seg.cy + Math.sin(a) * radius };
        }
        s -= seg.len;
      }
      return { x: 0, y: 0 };
    }

    function measure() {
      var host = canvas.parentElement;
      if (!host) return;
      var rect = host.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round((W + BLEED * 2) * dpr);
      canvas.height = Math.round((H + BLEED * 2) * dpr);
      canvas.style.width = (W + BLEED * 2) + 'px';
      canvas.style.height = (H + BLEED * 2) + 'px';
      canvas.style.left = -BLEED + 'px';
      canvas.style.top = -BLEED + 'px';
      shape = outline(W - thickness, H - thickness, radius);
      wake();
    }

    function paint() {
      if (!shape) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var offset = (BLEED + thickness / 2) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, offset, offset);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      var total = shape.total;
      var speed = Math.abs(velocity);
      var sign = velocity >= 0 ? 1 : -1;
      var tailLen = Math.min(speed * duration * trailLength, total * 0.34);

      var head = pointAt(phase);

      // 拖尾：从头部往回画一串线段，越远越淡
      if (tailLen > 1) {
        var steps = Math.min(48, Math.max(3, Math.ceil(tailLen / 3)));
        for (var i = 1; i <= steps; i++) {
          var u = 1 - i / steps;
          var p1 = pointAt(phase - sign * tailLen * ((i - 1) / steps));
          var p2 = pointAt(phase - sign * tailLen * (i / steps));
          var fade = u * u;
          // 外发光
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineWidth = 2 + 5 * glow;
          ctx.strokeStyle = 'rgba(' + color + ',' + (fade * 0.13 * glow).toFixed(3) + ')';
          ctx.stroke();
          // 实线
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineWidth = thickness;
          ctx.strokeStyle = 'rgba(' + color + ',' + (fade * 0.95).toFixed(3) + ')';
          ctx.stroke();
        }
      }

      // 头部光斑
      var reach = 7 + 15 * glow;
      var g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, reach);
      g.addColorStop(0, 'rgba(' + color + ',' + (0.3 * glow).toFixed(3) + ')');
      g.addColorStop(0.28, 'rgba(' + color + ',' + (0.14 * glow).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(head.x - reach, head.y - reach, reach * 2, reach * 2);

      // 头部芯点 + 十字星芒
      ctx.beginPath();
      ctx.arc(head.x, head.y, 0.85, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,246,232,.72)';
      ctx.fill();

    }

    function frame(now) {
      raf = 0;
      if (!alive) return;
      if (!last) last = now;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      var cruise = reduce ? 0 : shape.total / duration;
      velocity += (cruise - velocity) * (1 - Math.exp(-dt / 0.5));

      var extra = 0;
      if (lap >= 0) {
        var before = ease(Math.min(1, lap / LAP_TIME));
        lap += dt;
        extra = (ease(Math.min(1, lap / LAP_TIME)) - before) * shape.total;
        if (lap >= LAP_TIME) lap = -1;
      }
      phase = wrap(phase + velocity * dt + extra, shape.total);
      paint();

      var moving = Math.abs(velocity) > 0.5 || lap >= 0;
      if (moving || hover) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (raf || !alive || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    var host = canvas.parentElement;
    if (fine) {
      host.addEventListener('pointerenter', function () {
        hover = true;
        if (lap < 0 && !reduce) lap = 0;   // hover 时额外跑一整圈
        wake();
      });
      host.addEventListener('pointerleave', function () { hover = false; wake(); });
      host.addEventListener('focus', function () { if (lap < 0 && !reduce) lap = 0; wake(); });
    }

    var ro = new ResizeObserver(measure);
    ro.observe(host);
    var io = new IntersectionObserver(function (es) {
      visible = es.some(function (e) { return e.isIntersecting; });
      if (visible) wake();
    });
    io.observe(host);

    measure();

    return {
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        ro.disconnect(); io.disconnect();
      }
    };
  }

  /* ============================================================
   * 2. Magnet —— 指针靠近时元素朝指针偏移，弹簧收敛
   * 原版参数：stiffness 170 / damping 16 / mass 1 / padding 100
   * ========================================================== */
  var MAGNETS = [];
  var pointer = null;
  var magnetRaf = 0;
  var magnetLast = 0;

  function smoothstep(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function magnetTick(now) {
    magnetRaf = 0;
    var dt = magnetLast ? Math.min((now - magnetLast) / 1000, 1 / 30) : 1 / 60;
    magnetLast = now;
    var busy = false;

    for (var i = 0; i < MAGNETS.length; i++) {
      var m = MAGNETS[i];
      var tx = 0, ty = 0;

      if (pointer && fine && !reduce) {
        var r = m.el.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = pointer.x - cx;
        var dy = pointer.y - cy;
        var outside = Math.hypot(
          Math.max(0, Math.abs(dx) - r.width / 2),
          Math.max(0, Math.abs(dy) - r.height / 2)
        );
        if (outside <= m.padding) {
          var pull = 1 - smoothstep(m.padding * 0.5, m.padding, outside);
          tx = (dx / m.strength) * pull;
          ty = (dy / m.strength) * pull;
        }
      }

      // 位移上限：贴着工具栏的按钮最多挪 3px，再大就会盖住邻居
      if (m.maxOffset) {
        var len = Math.hypot(tx, ty);
        if (len > m.maxOffset) {
          tx = tx / len * m.maxOffset;
          ty = ty / len * m.maxOffset;
        }
      }

      // 半隐式欧拉，分 4 个子步保证稳定
      var steps = 4, h = dt / steps;
      for (var s = 0; s < steps; s++) {
        m.vx += (m.k * (tx - m.x) - m.d * m.vx) * h;
        m.vy += (m.k * (ty - m.y) - m.d * m.vy) * h;
        m.x += m.vx * h;
        m.y += m.vy * h;
      }
      if (Math.abs(tx - m.x) < 0.05 && Math.abs(ty - m.y) < 0.05 &&
          Math.abs(m.vx) < 0.05 && Math.abs(m.vy) < 0.05) {
        m.x = tx; m.y = ty; m.vx = 0; m.vy = 0;
      } else {
        busy = true;
      }
      m.inner.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,' + m.y.toFixed(2) + 'px,0)';
    }
    if (busy) magnetRaf = requestAnimationFrame(magnetTick);
    else magnetLast = 0;
  }

  function magnetRouse() {
    if (magnetRaf) return;
    magnetRaf = requestAnimationFrame(magnetTick);
  }

  if (fine) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      pointer = { x: e.clientX, y: e.clientY };
      magnetRouse();
    }, { passive: true });
    window.addEventListener('scroll', function () { pointer = null; magnetRouse(); }, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', function () { pointer = null; magnetRouse(); });
  }

  function Magnet(wrapper, options) {
    var opt = options || {};
    var inner = document.createElement('span');
    inner.style.display = 'inline-flex';
    inner.style.willChange = 'transform';
    while (wrapper.firstChild) inner.appendChild(wrapper.firstChild);
    wrapper.appendChild(inner);

    MAGNETS.push({
      el: wrapper, inner: inner,
      x: 0, y: 0, vx: 0, vy: 0,
      k: 170, d: 16,
      strength: opt.strength || 2.6,
      padding: opt.padding || 90,
      maxOffset: opt.maxOffset === undefined ? 0 : opt.maxOffset
    });
    return inner;
  }

  /* ============================================================
   * 3. ClickSpark —— 点击位置炸开 8 根短线
   * 原版：line 形状 / ease-out / 500ms / 重力 0
   * ========================================================== */
  function ClickSpark(opts) {
    var o = opts || {};
    var color = o.color || '224,161,92';
    var count = o.count || 8;
    var size = o.size || 11;
    var radius = o.radius || 26;
    var dur = o.duration || 460;

    var layer = document.createElement('canvas');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(layer);
    var ctx = layer.getContext('2d');

    var dpr = 1, bursts = [], raf = 0, last = 0;

    function fit() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      layer.width = Math.round(window.innerWidth * dpr);
      layer.height = Math.round(window.innerHeight * dpr);
    }
    fit();
    window.addEventListener('resize', fit);

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(now) {
      raf = 0;
      var dt = last ? now - last : 16;
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, layer.width, layer.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';

      var alive = false;
      for (var b = bursts.length - 1; b >= 0; b--) {
        var burst = bursts[b];
        var p = (now - burst.t) / dur;
        if (p >= 1) { bursts.splice(b, 1); continue; }
        alive = true;
        var e = easeOut(p);
        var fade = 1 - smoothstep(0.55, 1, p);
        for (var i = 0; i < burst.sparks.length; i++) {
          var sp = burst.sparks[i];
          var dist = radius * sp.reach * e;
          var x1 = burst.x + Math.cos(sp.a) * dist;
          var y1 = burst.y + Math.sin(sp.a) * dist;
          var len = size * sp.scale * Math.pow(1 - p, 1.6);
          var x2 = burst.x + Math.cos(sp.a) * (dist + len);
          var y2 = burst.y + Math.sin(sp.a) * (dist + len);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 1.4 * sp.scale;
          ctx.strokeStyle = 'rgba(' + color + ',' + (fade * 0.9).toFixed(3) + ')';
          ctx.stroke();
        }
      }
      if (alive) raf = requestAnimationFrame(frame);
      else last = 0;
    }

    function spawn(x, y) {
      if (reduce) return;
      var sparks = [];
      for (var i = 0; i < count; i++) {
        sparks.push({
          a: (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.35,
          reach: 1 + (Math.random() - 0.5) * 0.45,
          scale: 1 + (Math.random() - 0.5) * 0.5
        });
      }
      bursts.push({ x: x, y: y, t: performance.now(), sparks: sparks });
      if (bursts.length > 6) bursts.shift();
      if (!raf) raf = requestAnimationFrame(frame);
    }

    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      spawn(e.clientX, e.clientY);
    }, { passive: true });

    return { spawn: spawn };
  }

  /* ============================================================
   * 4. Spotlight —— 把指针坐标写进 --mx / --my
   * 样式层用 radial-gradient 消费这两个变量
   * ========================================================== */
  function Spotlight(el) {
    if (!fine) return;
    var queued = false;
    el.addEventListener('pointermove', function (e) {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
      });
    }, { passive: true });
  }

  /* ============================================================
   * 5. Reveal —— 进入视口时上浮 14px 淡入，只播一次
   * 参数取自 scroll-craft/taste.md：620ms ease-out，stagger 60ms
   * ========================================================== */
  function Reveal(root) {
    var items = (root || document).querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].style.opacity = '1';
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal'), 10) || 0;
        el.style.transition = 'opacity .62s cubic-bezier(.23,1,.32,1) ' + delay + 'ms, transform .62s cubic-bezier(.23,1,.32,1) ' + delay + 'ms';
        el.style.opacity = '1';
        el.style.transform = 'none';
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    for (var j = 0; j < items.length; j++) {
      items[j].style.opacity = '0';
      items[j].style.transform = 'translateY(14px)';
      io.observe(items[j]);
    }
  }

  /* ---------- 对外 ---------- */
  window.FX = {
    StarBorder: StarBorder,
    Magnet: Magnet,
    ClickSpark: ClickSpark,
    Spotlight: Spotlight,
    Reveal: Reveal
  };

  window.addEventListener('DOMContentLoaded', function () {
    ClickSpark({ color: '224,161,92', count: 8, size: 10, radius: 24 });

    var wrap = document.getElementById('ctaWrap');
    var cta = document.getElementById('newTicket');
    if (wrap && cta) {
      // canvas 挂在 wrap 上而不是按钮里：按钮为了裁 ripple 有 overflow:hidden，
      // 会把外扩的光晕切掉，只剩一条硬边。
      var cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;pointer-events:none;z-index:2';
      wrap.appendChild(cv);
      Magnet(wrap, { strength: 6, padding: 14, maxOffset: 3 });
      StarBorder(cv, { color: '255,240,222', duration: 3.4, thickness: 0.9, radius: 8, glow: 0.28, trailLength: 0.15 });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.kpi, .cust, .kcard, .ticket'), function (el) {
      Spotlight(el);
    });
  });
})();
