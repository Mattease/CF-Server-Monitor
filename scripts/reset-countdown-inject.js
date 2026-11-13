/* SAO 主题流量重置倒计时注入（kuskure 注入，非 SAO 原生代码）。
 * 由面板部署流程注入到 SAO index.html；不改 SAO 仓库。
 * 逻辑：拉 /api/servers 取每台的 reset_day/reset_time/timezone，
 * 按探针算法算下次重置剩余天数，注入到各卡片的流量值旁。
 * React 会重渲染覆盖注入点，用 MutationObserver 持续补注。
 */
(function () {
  'use strict';

  // ---- 时区工具（与面板 server.js 的 getZonedWallParts / daysInUtcMonth 等价的轻量实现）----
  function zonedParts(timeZone, ms) {
    try {
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || undefined,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
      });
      var parts = {};
      fmt.formatToParts(new Date(ms)).forEach(function (p) { parts[p.type] = p.value; });
      return {
        year: +parts.year, month: +parts.month, day: +parts.day,
        hour: +parts.hour === 24 ? 0 : +parts.hour,
        minute: +parts.minute, second: +parts.second
      };
    } catch (e) {
      var d = new Date(ms);
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
    }
  }
  function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function tzOffsetMs(timeZone, ms) {
    // 用两次 Intl 换算求该时区在该时刻的偏移（分钟级精度足够）
    try {
      var p = zonedParts(timeZone, ms);
      var asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      return asUTC - ms;
    } catch (e) { return -new Date(ms).getTimezoneOffset() * 60000; }
  }
  function zonedMs(year, month, day, h, m, s, timeZone) {
    var guess = Date.UTC(year, month - 1, day, h, m, s);
    var off = tzOffsetMs(timeZone, guess);
    var ms = guess - off;
    // 迭代一次纠正 DST 边界
    var off2 = tzOffsetMs(timeZone, ms);
    if (off2 !== off) ms = guess - off2;
    return ms;
  }
  function parseResetTime(resetTime) {
    var parts = String(resetTime || '00:00:00').split(':');
    return {
      h: Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0)),
      m: Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0)),
      s: Math.min(59, Math.max(0, parseInt(parts[2], 10) || 0))
    };
  }
  // 与面板 daysUntilNextReset / 探针算法一致：reset_day 超当月天数顺延下月 1 号
  function daysUntilNextReset(resetDay, resetTime, timeZone, nowMs) {
    var day = parseInt(resetDay, 10);
    if (!day || day < 1 || day > 31) return null;
    var t = parseResetTime(resetTime);
    var now = nowMs || Date.now();
    var wp = zonedParts(timeZone, now);
    var dim = daysInMonth(wp.year, wp.month);
    var targetDay = day, targetMonth = wp.month, targetYear = wp.year;
    if (day > dim) { targetDay = 1; targetMonth = wp.month + 1; if (targetMonth > 12) { targetMonth = 1; targetYear += 1; } }
    var targetMs = zonedMs(targetYear, targetMonth, targetDay, t.h, t.m, t.s, timeZone);
    if (targetMs <= now) {
      // 已过本月重置点，移到下月
      targetMonth += 1;
      if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      var dim2 = daysInMonth(targetYear, targetMonth);
      var d2 = day > dim2 ? 1 : day;
      targetMs = zonedMs(targetYear, targetMonth, d2, t.h, t.m, t.s, timeZone);
    }
    return Math.ceil((targetMs - now) / 86400000);
  }

  // ---- 拉服务器重置配置 ----
  var resetByUuid = {};   // uuid -> {days, text}
  var resetByName = {};   // name -> {days, text}
  function refreshResetData() {
    return fetch('/api/servers', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data.servers || data.data || []);
        resetByUuid = {};
        resetByName = {};
        list.forEach(function (s) {
          var days = daysUntilNextReset(s.reset_day, s.reset_time, s.timezone);
          if (days == null) return;
          var text = days <= 0 ? '今天重置' : days + '天后重置';
          var rec = { days: days, text: text };
          if (s.uuid) resetByUuid[s.uuid] = rec;
          if (s.id) resetByUuid[s.id] = rec;
          if (s.name) resetByName[s.name] = rec;
        });
      })
      .catch(function () { /* 失败则沿用旧数据 */ });
  }

  // ---- 注入 ----
  function serverKeyForCard(card) {
    // 优先用卡片内 /server/<uuid> 链接
    var link = card.querySelector('a[href*="/server/"]');
    if (link) {
      var m = link.getAttribute('href').match(/\/server\/([^/?#]+)/);
      if (m) {
        var uuid = decodeURIComponent(m[1]);
        if (resetByUuid[uuid]) return { kind: 'uuid', key: uuid };
      }
      var title = (link.getAttribute('title') || link.textContent || '').trim();
      if (title && resetByName[title]) return { kind: 'name', key: title };
    }
    // 兜底：卡片文本里找服务器名
    var text = card.textContent || '';
    var names = Object.keys(resetByName);
    for (var i = 0; i < names.length; i++) {
      if (names[i] && text.indexOf(names[i]) !== -1) return { kind: 'name', key: names[i] };
    }
    return null;
  }
  function injectIntoCard(card) {
    if (!card || card.dataset.kuskureResetDone) return;
    var found = serverKeyForCard(card);
    if (!found) return;
    var rec = found.kind === 'uuid' ? resetByUuid[found.key] : resetByName[found.key];
    if (!rec) return;
    // 找流量值元素：SAO 紧凑卡用 .compact-node-traffic-value；其它布局找含“流量”标签的行
    var valueEl = card.querySelector('.compact-node-traffic-value');
    if (!valueEl) {
      // 兜底：找流量标签后最近的值元素
      var labels = card.querySelectorAll('span');
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].textContent.trim() === '流量') {
          var row = labels[i].closest('div');
          if (row) valueEl = row.parentElement ? row.parentElement.querySelector('span:last-child') : null;
          break;
        }
      }
    }
    if (!valueEl) return;
    // 已注入过则跳过（React 重渲染会清掉标记，届时重新注入）
    if (valueEl.querySelector('[data-kuskure-reset]')) return;
    var badge = document.createElement('span');
    badge.setAttribute('data-kuskure-reset', '1');
    badge.textContent = ' · ' + rec.text;
    badge.style.cssText = 'margin-left:2px;white-space:nowrap;';
    valueEl.appendChild(badge);
    card.dataset.kuskureResetDone = '1';
  }
  function scanAll() {
    // SAO 卡片：article.compact-node-card / .server-card / article[id^="node-card-"]
    var cards = document.querySelectorAll('article.compact-node-card, article.server-card, article[id^="node-card-"], .compact-node-card, .server-card');
    cards.forEach(injectIntoCard);
  }

  var observer = null;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      // React 重渲染会清掉注入标记与 data 属性，重新扫描
      document.querySelectorAll('article.compact-node-card, article.server-card, article[id^="node-card-"], .compact-node-card, .server-card').forEach(function (card) {
        if (card.dataset.kuskureResetDone) {
          // 检查注入是否还在，不在则清标记重注
          if (!card.querySelector('[data-kuskure-reset]')) delete card.dataset.kuskureResetDone;
        }
        injectIntoCard(card);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    refreshResetData().then(function () {
      scanAll();
      startObserver();
    });
    // 每小时刷新一次重置数据（跨天/跨重置点时更新）
    setInterval(function () { refreshResetData().then(scanAll); }, 3600000);
    // 兜底：定期扫一次，防止 Observer 漏掉
    setInterval(scanAll, 15000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
