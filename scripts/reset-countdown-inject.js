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
  // 候选本月与下月（for add 循环），每候选月内若 day 超天数则顺延到再下月 1 号，
  // 取第一个在未来的候选时刻。旧写法在“已过本月重置点且下月天数不足”时漏加月份
  // （如 1 月 31 日 14:00、reset_day=31 会错算成 2 月 1 日，正确为 3 月 1 日）。
  function daysUntilNextReset(resetDay, resetTime, timeZone, nowMs) {
    var day = parseInt(resetDay, 10);
    if (!day || day < 1 || day > 31) return null;
    var t = parseResetTime(resetTime);
    var now = nowMs || Date.now();
    var wp = zonedParts(timeZone, now);
    for (var add = 0; add < 2; add++) {
      var total = wp.month - 1 + add;
      var y = wp.year + Math.floor(total / 12);
      var m = ((total % 12) + 12) % 12 + 1;
      var dim = daysInMonth(y, m);
      var ry = y, rm = m, rd = day;
      if (day > dim) {
        var nt = m + 1;
        ry = nt > 12 ? y + 1 : y;
        rm = nt > 12 ? 1 : nt;
        rd = 1;
      }
      var ms = zonedMs(ry, rm, rd, t.h, t.m, t.s, timeZone);
      if (ms > now) return Math.ceil((ms - now) / 86400000);
    }
    return null;
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
          var dayNum = parseInt(s.reset_day, 10);
          var rec = { days: days, dayNum: dayNum };
          if (s.uuid) resetByUuid[s.uuid] = rec;
          if (s.id) resetByUuid[s.id] = rec;
          if (s.name) resetByName[s.name] = rec;
        });
      })
      .catch(function () { /* 失败则沿用旧数据 */ });
  }

  // ---- 注入 ----
  // 徽章：方案2（数字突出）+ 方案4（按紧急变色）结合。
  // 数字比正文略大（13px vs 11px），颜色按剩余天数分三档：
  // >7 天淡靛蓝，4–7 天琥珀黄，≤3 天（含今天）红色。
  function badgeColors(days) {
    if (days <= 3) return { bg: '#fef2f2', fg: '#dc2626', border: '#fecaca' };
    if (days <= 7) return { bg: '#fffbeb', fg: '#d97706', border: '#fde68a' };
    return { bg: '#f5f7ff', fg: '#818cf8', border: '#e0e7ff' };
  }
  function makeBadge(rec) {
    var c = badgeColors(rec.days);
    var badge = document.createElement('span');
    badge.setAttribute('data-kuskure-reset', '1');
    badge.style.cssText = [
      'display:inline-flex', 'align-items:baseline', 'white-space:nowrap', 'flex-shrink:0',
      'margin-left:6px', 'padding:0 6px', 'border-radius:999px',
      'background:' + c.bg, 'color:' + c.fg, 'border:1px solid ' + c.border,
      'font-size:10px', 'line-height:14px', 'font-weight:500', 'letter-spacing:0.5px'
    ].join(';');
    // 数字（或“今天”）略大加粗，其余小字
    var num = document.createElement('span');
    num.textContent = rec.days <= 0 ? '今天' : String(rec.days);
    num.style.cssText = 'font-size:12px;line-height:14px;font-weight:700;';
    badge.appendChild(num);
    var rest = document.createElement('span');
    rest.textContent = rec.days <= 0 ? '重置 · ' + rec.dayNum + '号' : '天后重置 · ' + rec.dayNum + '号';
    badge.appendChild(rest);
    return badge;
  }
  // 把徽章塞进 label 内部末尾（紧贴标签文字），避免被 flex 布局换到下一行
  function injectBadgeIntoLabel(labelEl, rec) {
    if (!labelEl || labelEl.querySelector('[data-kuskure-reset]')) return false;
    labelEl.appendChild(makeBadge(rec));
    return true;
  }
  function recForName(text) {
    var names = Object.keys(resetByName);
    for (var i = 0; i < names.length; i++) {
      if (names[i] && text.indexOf(names[i]) !== -1) return resetByName[names[i]];
    }
    return null;
  }
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
    var rec = recForName(card.textContent || '');
    if (rec) {
      var names = Object.keys(resetByName);
      for (var i = 0; i < names.length; i++) {
        if (names[i] && (card.textContent || '').indexOf(names[i]) !== -1) return { kind: 'name', key: names[i] };
      }
    }
    return null;
  }
  // 小视图（紧凑卡片）：注入点是 .compact-node-traffic-label（“流量”）
  function injectIntoCard(card) {
    if (!card || card.dataset.kuskureResetDone) return;
    var found = serverKeyForCard(card);
    if (!found) return;
    var rec = found.kind === 'uuid' ? resetByUuid[found.key] : resetByName[found.key];
    if (!rec) return;
    var labelEl = card.querySelector('.compact-node-traffic-label');
    if (!labelEl) {
      // 兜底：找文字为“流量”的 span
      var labels = card.querySelectorAll('span');
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].textContent.trim() === '流量') { labelEl = labels[i]; break; }
      }
    }
    if (!labelEl) return;
    if (injectBadgeIntoLabel(labelEl, rec)) card.dataset.kuskureResetDone = '1';
  }
  // 大视图（详情页/展开卡片）：注入点是 .traffic-quota-label（“剩余流量”）
  function injectIntoDetailView() {
    var labels = document.querySelectorAll('.traffic-quota-label');
    if (!labels.length) return;
    // 先认当前是哪台：详情页 URL /server/<uuid> 最准
    var rec = null;
    var m = (window.location.pathname || '').match(/\/server\/([^/?#]+)/);
    if (m) rec = resetByUuid[decodeURIComponent(m[1])] || null;
    if (!rec) rec = recForName(document.body.textContent || '');
    if (!rec) return;
    labels.forEach(function (labelEl) {
      injectBadgeIntoLabel(labelEl, rec);
    });
  }
  function scanAll() {
    // 小视图卡片：article.compact-node-card / .server-card / article[id^="node-card-"]
    var cards = document.querySelectorAll('article.compact-node-card, article.server-card, article[id^="node-card-"], .compact-node-card, .server-card');
    cards.forEach(injectIntoCard);
    // 大视图（详情页/展开卡片）
    injectIntoDetailView();
  }

  var observer = null;
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      // React 重渲染会清掉注入标记与 data 属性，重新扫描（小视图卡片 + 大视图）
      document.querySelectorAll('article.compact-node-card, article.server-card, article[id^="node-card-"], .compact-node-card, .server-card').forEach(function (card) {
        if (card.dataset.kuskureResetDone) {
          // 检查注入是否还在，不在则清标记重注
          if (!card.querySelector('[data-kuskure-reset]')) delete card.dataset.kuskureResetDone;
        }
        injectIntoCard(card);
      });
      injectIntoDetailView();
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
