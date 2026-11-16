// 流量重置倒计时贴标脚本（Worker 端注入外部主题时使用）。
// 由 src/handlers/frontend.js 在返回外部主题（theme_url）HTML 时，包进 <script> 插到 </body> 前。
// 2026-11-17 方案一：不在浏览器里算日期。下次重置时刻由服务端在 /api/servers 里以
// reset_next_ts（epoch 毫秒）下发（算法唯一实现在 src/shared/resetTime.js），
// 本脚本只负责把倒计时贴到流量标签后并每秒按目标时刻重算显示，自身不做日期推算。
// 样式：紧跟“流量”标签文字之后，继承标签的字号/字体/颜色，仅分隔符“·”加粗，无底色无边框。
// 本文件是唯一来源；改动直接改这里（注意：脚本内容含在模板字符串里，不能出现反引号与美元花括号序列，
// 更不能出现任何反斜杠——模板字符串会把反斜杠吃掉一层，2026-11-17 就因此把正则弄成注释、
// 整段脚本语法错误从未运行。test/placer-script.test.js 对此有回归断言。）
export const RESET_COUNTDOWN_PLACER_SCRIPT = `/* SAO 主题流量重置倒计时贴标（kuskure 注入，非 SAO 原生代码）。
 * 由面板 Worker 注入到 SAO index.html；不改 SAO 仓库。
 * 数据：拉 /api/servers 取每台的 reset_next_ts（服务端算好的下次重置时刻）。
 * React 会重渲染覆盖注入点，用 MutationObserver 持续补注；贴不上就静默不贴。
 */
(function () {
  'use strict';

  var resetByUuid = {};   // uuid/id -> reset_next_ts
  var resetByName = {};   // name -> reset_next_ts

  function apiBasePrefix() {
    try {
      var meta = document.querySelector('meta[name="apiBase"]');
      var base = meta && meta.content ? String(meta.content).trim() : '';
      while (base.charAt(base.length - 1) === '/') base = base.slice(0, -1);
      return base;
    } catch (e) { return ''; }
  }
  function refreshResetData() {
    var headers = {};
    try {
      var tv = localStorage.getItem('turnstile_verified');
      if (tv) headers['X-Turnstile-Verified'] = tv;
      var jwt = localStorage.getItem('jwt_token');
      if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
    } catch (e) { /* localStorage 不可用时忽略 */ }
    return fetch(apiBasePrefix() + '/api/servers', { credentials: 'same-origin', headers: headers })
      .then(function (r) { if (!r.ok) throw new Error('servers HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data.servers || data.data || []);
        var byUuid = {};
        var byName = {};
        list.forEach(function (s) {
          var ts = Number(s.reset_next_ts);
          if (!isFinite(ts) || ts <= 0) return;
          if (s.uuid) byUuid[s.uuid] = ts;
          if (s.id) byUuid[s.id] = ts;
          if (s.name) byName[s.name] = ts;
        });
        resetByUuid = byUuid;
        resetByName = byName;
      })
      .catch(function () { /* 失败则沿用旧数据 */ });
  }

  // ---- 倒计时文字：对着目标时刻算差值，不做任何日期推算 ----
  function formatRemaining(target, now) {
    var diff = target - now;
    if (diff <= 0) return '0分重置';
    var totalSec = Math.floor(diff / 1000);
    var parts = [
      [Math.floor(totalSec / 86400), '天'],
      [Math.floor((totalSec % 86400) / 3600), '小时'],
      [Math.floor((totalSec % 3600) / 60), '分']
    ];
    var start = 0;
    while (start < 2 && parts[start][0] === 0) start++;
    var out = '';
    for (var i = start; i < 3; i++) out += parts[i][0] + parts[i][1];
    return out + '重置';
  }

  var lastRefreshAt = 0;
  function tick() {
    var now = Date.now();
    var pastDue = false;
    document.querySelectorAll('[data-kuskure-cd]').forEach(function (el) {
      var target = Number(el.getAttribute('data-kuskure-target'));
      if (!isFinite(target)) return;
      var text = formatRemaining(target, now);
      if (el.textContent !== text) el.textContent = text;
      if (target <= now) pastDue = true;
    });
    // 任一台已过重置点：拉一次新数据换上新一轮目标时刻（1 分钟内最多一次）
    if (pastDue && now - lastRefreshAt > 60000) {
      lastRefreshAt = now;
      refreshResetData().then(scanAll);
    }
  }

  // ---- 贴标 ----
  function makeCountdown(ts) {
    var wrap = document.createElement('span');
    wrap.setAttribute('data-kuskure-reset', '1');
    wrap.style.cssText = 'white-space:nowrap;font-variant-numeric:tabular-nums;';
    var dot = document.createElement('b');
    dot.textContent = '· ';
    wrap.appendChild(dot);
    var cd = document.createElement('span');
    cd.setAttribute('data-kuskure-cd', '1');
    cd.setAttribute('data-kuskure-target', String(ts));
    cd.textContent = formatRemaining(ts, Date.now());
    wrap.appendChild(cd);
    return wrap;
  }
  // 塞进 label 内部末尾（紧贴标签文字）；已有则只同步目标时刻。贴不上返回 false，静默跳过。
  function injectIntoLabel(labelEl, ts) {
    if (!labelEl) return false;
    var existing = labelEl.querySelector('[data-kuskure-cd]');
    if (existing) {
      if (existing.getAttribute('data-kuskure-target') !== String(ts)) {
        existing.setAttribute('data-kuskure-target', String(ts));
        existing.textContent = formatRemaining(ts, Date.now());
      }
      return false;
    }
    labelEl.appendChild(makeCountdown(ts));
    return true;
  }
  function tsForName(text) {
    var names = Object.keys(resetByName);
    for (var i = 0; i < names.length; i++) {
      if (names[i] && text.indexOf(names[i]) !== -1) return resetByName[names[i]];
    }
    return null;
  }
  // 从 /server/<uuid> 形式的链接或路径里取 uuid（用字符串查找，不用正则：禁反斜杠）
  function serverIdFromPath(path) {
    var marker = '/server/';
    var text = String(path || '');
    var i = text.indexOf(marker);
    if (i === -1) return null;
    var rest = text.slice(i + marker.length);
    var end = rest.length;
    var cuts = ['/', '?', '#'];
    for (var k = 0; k < cuts.length; k++) {
      var j = rest.indexOf(cuts[k]);
      if (j !== -1 && j < end) end = j;
    }
    var id = rest.slice(0, end);
    if (!id) return null;
    try { return decodeURIComponent(id); } catch (e) { return id; }
  }
  function tsForCard(card) {
    // 优先用卡片内 /server/<uuid> 链接
    var link = card.querySelector('a[href*="/server/"]');
    if (link) {
      var uuid = serverIdFromPath(link.getAttribute('href'));
      if (uuid && resetByUuid[uuid]) return resetByUuid[uuid];
      var title = (link.getAttribute('title') || link.textContent || '').trim();
      if (title && resetByName[title]) return resetByName[title];
    }
    // 兜底：卡片文本里找服务器名
    return tsForName(card.textContent || '');
  }
  function findTrafficLabel(card) {
    var labelEl = card.querySelector('.compact-node-traffic-label');
    if (labelEl) return labelEl;
    // 兜底：找文字为“流量”的 span
    var labels = card.querySelectorAll('span');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === '流量') return labels[i];
    }
    return null;
  }
  // 小视图（紧凑卡片）：注入点是 .compact-node-traffic-label（“流量”）
  function injectIntoCard(card) {
    if (!card) return;
    var ts = tsForCard(card);
    if (!ts) return;
    injectIntoLabel(findTrafficLabel(card), ts);
  }
  // 大视图（详情页/展开卡片）：注入点是 .traffic-quota-label（“剩余流量”）
  function injectIntoDetailView() {
    var labels = document.querySelectorAll('.traffic-quota-label');
    if (!labels.length) return;
    // 先认当前是哪台：详情页 URL /server/<uuid> 最准
    var ts = null;
    var uid = serverIdFromPath(window.location.pathname || '');
    if (uid) ts = resetByUuid[uid] || null;
    if (!ts) ts = tsForName(document.body.textContent || '');
    if (!ts) return;
    labels.forEach(function (labelEl) { injectIntoLabel(labelEl, ts); });
  }
  function scanAll() {
    document.querySelectorAll('article.compact-node-card, article.server-card, article[id^="node-card-"], .compact-node-card, .server-card').forEach(injectIntoCard);
    injectIntoDetailView();
  }

  var observer = null;
  var observerScheduled = false;
  function runObserverScan() {
    observerScheduled = false;
    scanAll();
  }
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      // rAF 节流合并：SAO 经 WebSocket 高频刷新，避免每次 DOM 变动都全量扫描
      if (observerScheduled) return;
      observerScheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(runObserverScan);
      } else {
        setTimeout(runObserverScan, 0);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    lastRefreshAt = Date.now();
    refreshResetData().then(function () {
      scanAll();
      startObserver();
    });
    // 每秒按目标时刻重算显示（本地计算，不发请求）
    setInterval(tick, 1000);
    // 每小时刷新一次重置数据（配置变更/跨周期时更新目标时刻）
    setInterval(function () {
      lastRefreshAt = Date.now();
      refreshResetData().then(scanAll);
    }, 3600000);
    // 兜底：定期扫一次，防止 Observer 漏掉
    setInterval(scanAll, 15000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
