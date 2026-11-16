// SAO 贴标脚本（src/utils/resetCountdownPlacer.js）回归测试。
// 背景：2026-11-17 首版把正则写进了模板字符串，反斜杠被吃掉一层，
// 服务端下发的脚本带语法错误、从未运行（旧药丸脚本同病）。
// 本测试锁死三件事：下发文本可解析、文本里零反斜杠、在桩 DOM 上真能贴上并逐秒走字。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESET_COUNTDOWN_PLACER_SCRIPT as SCRIPT } from '../src/utils/resetCountdownPlacer.js';

test('下发脚本可解析且不含反斜杠', () => {
  assert.doesNotThrow(() => new Function(SCRIPT));
  assert.equal(SCRIPT.includes('\\'), false, 'cooked script must not contain backslashes');
  assert.ok(!SCRIPT.includes('match(//'), 'regex must not degrade into a comment');
  assert.ok(!SCRIPT.includes('replace(//'), 'regex must not degrade into a comment');
});

// ---- 最小 DOM 桩：只实现贴标脚本用到的接口 ----
function matchSimple(el, sel) {
  let rest = sel.trim();
  const tagMatch = rest.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tagMatch) {
    if (el.tagName !== tagMatch[0].toUpperCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }
  while (rest.length) {
    if (rest[0] === '.') {
      const m = rest.match(/^\.([a-zA-Z0-9-_]+)/);
      const classes = (el.attrs.class || '').split(/\s+/);
      if (!classes.includes(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === '[') {
      const m = rest.match(/^\[([a-zA-Z0-9-_]+)(?:([*^$]?=)"([^"]*)")?\]/);
      if (!m) return false;
      const val = el.attrs[m[1]];
      if (val === undefined) return false;
      if (m[2] === '*=' && !String(val).includes(m[3])) return false;
      if (m[2] === '^=' && !String(val).startsWith(m[3])) return false;
      if (m[2] === '$=' && !String(val).endsWith(m[3])) return false;
      if (m[2] === '=' && String(val) !== m[3]) return false;
      rest = rest.slice(m[0].length);
    } else {
      return false;
    }
  }
  return true;
}
function matchAny(el, group) {
  return group.split(',').some(sel => matchSimple(el, sel));
}
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attrs = {};
    this._text = '';
    this.style = {};
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  appendChild(c) { this.children.push(c); return c; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  descendants() {
    const out = [];
    const walk = (e) => { for (const c of e.children) { out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  querySelectorAll(sel) { return this.descendants().filter(el => matchAny(el, sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function el(tag, cls, text) {
  const e = new El(tag);
  if (cls) e.setAttribute('class', cls);
  if (text) e._text = text;
  return e;
}
// 按 SAO 紧凑卡片真实结构搭一张卡：详情链接 /server/<uuid> + 流量标签
function buildCard({ uuid, name, withLink = true }) {
  const card = el('article', 'compact-node-card');
  const title = el('span', 'compact-node-title', name);
  card.appendChild(title);
  if (withLink) {
    const link = el('a', 'compact-node-detail-link');
    link.setAttribute('href', '/server/' + encodeURIComponent(uuid));
    card.appendChild(link);
  }
  const head = el('div', 'compact-node-traffic-head');
  const label = el('span', 'compact-node-traffic-label');
  label.appendChild(el('svg'));
  label.appendChild(el('span', '', '流量'));
  head.appendChild(label);
  head.appendChild(el('span', 'compact-node-traffic-value', '138 GB / 500 GB'));
  card.appendChild(head);
  return { card, label };
}

test('贴标脚本在桩 DOM 上贴上倒计时并逐秒走字', async () => {
  const T0 = 1795000000000;
  const OFFSET = ((8 * 24 + 3) * 3600 + 13 * 60 + 24) * 1000;
  const realNow = Date.now;
  Date.now = () => T0;
  try {
    const root = el('body');
    const c1 = buildCard({ uuid: 'uuid-38', name: 'VMISS.US.LA.TRI.Basic' });
    const c2 = buildCard({ uuid: 'unused', name: '干杯云AT&T商业宽带PRO', withLink: false });
    root.appendChild(c1.card);
    root.appendChild(c2.card);

    const payload = {
      servers: [
        { uuid: 'uuid-38', name: 'VMISS.US.LA.TRI.Basic', reset_next_ts: T0 + OFFSET },
        { uuid: 'uuid-70', name: '干杯云AT&T商业宽带PRO', reset_next_ts: T0 + 3600000 }
      ]
    };
    const intervals = [];
    const documentStub = {
      readyState: 'complete',
      body: root,
      createElement: (t) => new El(t),
      querySelector: (sel) => root.querySelectorAll(sel)[0] || null,
      querySelectorAll: (sel) => root.querySelectorAll(sel),
      addEventListener: () => {}
    };
    const run = new Function(
      'document', 'window', 'localStorage', 'fetch', 'MutationObserver', 'setInterval', 'requestAnimationFrame',
      SCRIPT
    );
    run(
      documentStub,
      { location: { pathname: '/' } },
      { getItem: () => null },
      async () => ({ ok: true, json: async () => payload }),
      class { observe() {} },
      (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
      () => {}
    );
    // 等 refreshResetData 的 promise 链跑完
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));

    const cd1 = c1.label.querySelector('[data-kuskure-cd]');
    assert.ok(cd1, 'card1 (uuid link) should get a countdown');
    assert.equal(cd1.textContent, '8天3小时13分24秒重置');
    const wrap1 = c1.label.querySelector('[data-kuskure-reset]');
    assert.ok(wrap1, 'wrapper present');
    assert.equal(wrap1.children[0].tagName, 'B');
    assert.equal(wrap1.children[0].textContent, '· ');

    const cd2 = c2.label.querySelector('[data-kuskure-cd]');
    assert.ok(cd2, 'card2 (name fallback) should get a countdown');
    assert.equal(cd2.textContent, '1小时0分0秒重置');

    // 推进 61 秒后触发 1 秒定时器，文字应随之减少
    Date.now = () => T0 + 61000;
    const tick = intervals.find(i => i.ms === 1000);
    assert.ok(tick, 'tick interval registered');
    tick.fn();
    assert.equal(cd1.textContent, '8天3小时12分23秒重置');
    assert.equal(cd2.textContent, '58分59秒重置');
  } finally {
    Date.now = realNow;
  }
});
