/* effects.js —— 界面视觉反馈
 * 四个效果，动画交给 CSS，JS 只写坐标和插入节点：
 *   边缘流光  主按钮描边一圈光点（CSS 旋转渐变）
 *   指针磁吸  主按钮随指针轻微位移
 *   点击火花  点击处散开八个小点
 *   卡片聚光  把指针坐标写进 --mx / --my，样式层消费
 * 尊重 prefers-reduced-motion；触屏设备跳过指针相关效果。
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* 1. 卡片聚光：列表与看板由 JS 动态渲染，用事件委托才能覆盖后插入的卡片 */
  function Spotlight() {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.kpi, .cust, .kcard, .ticket');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    }, { passive: true });
  }

  /* 2. 指针磁吸：位移上限 3px，回中交给 CSS transition */
  function Magnet(wrap) {
    wrap.addEventListener('pointermove', function (e) {
      var r = wrap.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      wrap.style.transform = 'translate(' + (clamp(x, -1, 1) * 3).toFixed(1) + 'px,'
        + (clamp(y, -1, 1) * 3).toFixed(1) + 'px)';
    }, { passive: true });
    wrap.addEventListener('pointerleave', function () { wrap.style.transform = ''; });
  }

  /* 3. 点击火花：八个临时节点，动画结束即移除 */
  function ClickSpark() {
    document.addEventListener('pointerdown', function (e) {
      for (var i = 0; i < 8; i++) {
        var a = Math.PI * 2 * i / 8 + Math.random() * 0.35;
        var d = 18 + Math.random() * 10;
        var dot = document.createElement('i');
        dot.className = 'spark-dot';
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
        dot.style.setProperty('--sx', (Math.cos(a) * d).toFixed(1) + 'px');
        dot.style.setProperty('--sy', (Math.sin(a) * d).toFixed(1) + 'px');
        document.body.appendChild(dot);
        (function (node) { setTimeout(function () { node.remove(); }, 520); })(dot);
      }
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (fine) {
      var wrap = document.getElementById('ctaWrap');
      if (wrap) Magnet(wrap);
      Spotlight();
    }
    if (!reduce) ClickSpark();
  });
})();
