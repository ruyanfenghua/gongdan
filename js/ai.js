/* ============================================================
 * ai.js — 相似工单检索与回复草稿生成
 *
 * 思路：把每条工单的标题+描述+类型转成 TF-IDF 向量，
 * 中文没有现成分词，用字符二元组（bigram）切；
 * 新工单录入时算余弦相似度，实时提示历史上最相近的单，
 * 防止同一问题重复建单；AI 建议回复则引用最相近的
 * 已解决工单的处理结论拼装草稿，相似度过低就退回通用模板。
 * 全部在浏览器本地计算，无网络请求。
 * ============================================================ */

var AITickets = (function () {
  // HTML 转义：工单文本直接来自客户输入，插进 DOM 前必须过一遍
  window.esc = window.esc || function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // 中文 bigram 切词：英文数字按词，中文按相邻两字
  function tokenize(text) {
    var s = String(text || '').toLowerCase();
    var out = [];
    var buf = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (/[a-z0-9]+/.test(ch)) { buf += ch; continue; }
      if (buf) { out.push(buf); buf = ''; }
      if (/[\u4e00-\u9fa5]/.test(ch) && i + 1 < s.length && /[\u4e00-\u9fa5]/.test(s[i + 1])) {
        out.push(ch + s[i + 1]);
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  var docs = [];        // { id, tf: Map, tokens: n }
  var idf = {};         // term -> idf
  var N = 0;

  function build(all) {
    docs = [];
    idf = {};
    var df = {};
    all.forEach(function (t) {
      var terms = tokenize(t.title + ' ' + t.desc + ' ' + t.type);
      var tf = {};
      terms.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      docs.push({ ref: t, tf: tf, n: terms.length });
      Object.keys(tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
    });
    N = docs.length;
    Object.keys(df).forEach(function (w) {
      // 平滑 idf，避免除零
      idf[w] = Math.log((N + 1) / (df[w] + 1)) + 1;
    });
  }

  function vec(tf, n) {
    var v = {};
    var norm = 0;
    Object.keys(tf).forEach(function (w) {
      var x = (tf[w] / n) * (idf[w] || 1);
      v[w] = x;
      norm += x * x;
    });
    return { v: v, norm: Math.sqrt(norm) };
  }

  function cosine(a, b) {
    var small = a.norm < b.norm ? a : b;
    var big = small === a ? b : a;
    var dot = 0;
    Object.keys(small.v).forEach(function (w) {
      if (big.v[w]) dot += small.v[w] * big.v[w];
    });
    if (!a.norm || !b.norm) return 0;
    return dot / (a.norm * b.norm);
  }

  // 查最相近的 k 条，excludeId 排除自身
  function similar(text, excludeId, k) {
    k = k || 3;
    var terms = tokenize(text);
    if (!terms.length) return [];
    var tf = {};
    terms.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
    var q = vec(tf, terms.length);
    return docs
      .filter(function (d) { return d.ref.id !== excludeId; })
      .map(function (d) {
        return { ticket: d.ref, score: cosine(q, vec(d.tf, d.n)) };
      })
      .filter(function (x) { return x.score > 0.02; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, k);
  }

  return { build: build, similar: similar, tokenize: tokenize };
})();

/* 回复草稿：拿最相近的已解决工单的处理结论当依据。
 * 相似度太低（<0.12）说明没有历史参照，退回通用模板，
 * 不硬编一个看似有依据的回复——那比没有更糟。 */
function aiDraft(t) {
  var hits = AITickets.similar(t.title + ' ' + t.desc, t.id, 5)
    .filter(function (x) { return x.ticket.status === 'done'; });
  var best = hits[0];

  if (best && best.score >= 0.12) {
    var bt = best.ticket;
    var last = bt.timeline && bt.timeline.length ? bt.timeline[bt.timeline.length - 1] : null;
    var solution = last ? last.title : '已按标准流程处理完毕';
    var pct = Math.round(best.score * 100);
    return {
      from: bt.id,
      pct: pct,
      text: '您好，' + cust(t.customer).contact + '。您反馈的问题与工单 ' + bt.id +
        '（' + esc(bt.title) + '）情况相近，当时经排查已解决：' + solution +
        '。我们已安排 ' + (t.owner || '工程师') + ' 按同一思路跟进，预计 1 小时内给出处理结论；期间如影响使用，请先告知受影响的具体点位，便于优先恢复。'
    };
  }
  return {
    from: null,
    pct: 0,
    text: '您好，' + cust(t.customer).contact + '。已收到您反馈的问题，我们已安排 ' +
      (t.owner || '工程师') + ' 跟进排查，预计 1 小时内给出处理结论。期间如影响正常使用，请先告知受影响的具体点位，便于优先恢复。'
  };
}
