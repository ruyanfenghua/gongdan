/* ============================================================
   音效：全部用 Web Audio 合成，不加载任何音频文件
   ============================================================ */
const Sfx = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.08, gain = 0.06, slideTo = null, delay = 0 }) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.12, gain = 0.03, hp = 900, lp = 6000 }) {
    const c = ac();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource();
    src.buffer = buf;
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = hp;
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = lp;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(hpf).connect(lpf).connect(g).connect(c.destination);
    src.start();
  }

  const api = {
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    /* 轻点 */
    tap() {
      if (!enabled) return;
      tone({ freq: 1180, type: 'sine', dur: 0.045, gain: 0.035, slideTo: 900 });
    },
    /* 导航切换 */
    nav() {
      if (!enabled) return;
      tone({ freq: 520, type: 'triangle', dur: 0.07, gain: 0.045, slideTo: 720 });
      noise({ dur: 0.06, gain: 0.012, hp: 2000 });
    },
    /* 打开抽屉 */
    open() {
      if (!enabled) return;
      tone({ freq: 300, type: 'sine', dur: 0.14, gain: 0.05, slideTo: 560 });
    },
    /* 关闭 */
    close() {
      if (!enabled) return;
      tone({ freq: 520, type: 'sine', dur: 0.12, gain: 0.04, slideTo: 280 });
    },
    /* 成功 */
    success() {
      if (!enabled) return;
      tone({ freq: 660, type: 'sine', dur: 0.1, gain: 0.05 });
      tone({ freq: 880, type: 'sine', dur: 0.14, gain: 0.045, delay: 0.075 });
      tone({ freq: 1320, type: 'sine', dur: 0.16, gain: 0.028, delay: 0.15 });
    },
    /* 拖拽落位 */
    drop() {
      if (!enabled) return;
      tone({ freq: 180, type: 'sine', dur: 0.11, gain: 0.07, slideTo: 120 });
      noise({ dur: 0.09, gain: 0.02, hp: 400 });
    },
    /* 悬停微声（很轻，避免吵） */
    hover() {
      if (!enabled) return;
      tone({ freq: 1500, type: 'sine', dur: 0.028, gain: 0.012 });
    },
    /* 错误 */
    error() {
      if (!enabled) return;
      tone({ freq: 220, type: 'sawtooth', dur: 0.16, gain: 0.05, slideTo: 150 });
    },
  };
  return api;
})();
