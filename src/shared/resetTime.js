// 流量重置时间计算的唯一实现（Worker 与前端共用）。
// 原先有三份拷贝：前端 src/frontend/utils/server.js、SAO 注入脚本、（探针侧另有周期算法）。
// 2026-11-17 收敛到这里：前端 daysUntilNextReset 改为转发本文件，
// /api/servers 由服务端用 nextResetTimestampMs 算好下次重置时刻下发，
// SAO 贴标脚本只显示、不再自己算日期。
import { daysInUtcMonth } from './serverBilling.js';

// 把某时刻在目标时区的墙上时间拆成年月日时分秒（字符串字段）。
export function getZonedWallParts(timestamp, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map(part => [part.type, part.value])
  );
}

// 目标时区在某时刻相对 UTC 的偏移（毫秒）。
export function getTimezoneOffsetMs(timestamp, timeZone) {
  const parts = getZonedWallParts(timestamp, timeZone);
  const wallAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return wallAsUtc - timestamp;
}

// 下次流量重置的时刻（epoch 毫秒）；reset_day 为 0/空/非法表示不重置，返回 null。
// 规则与面板已配的 reset_day / reset_time / timezone 一致：
// reset_day 超出当月天数时顺延到下月 1 号，时刻仍用 reset_time。
// 候选只看本月与下月：若本月候选已过，下月候选必然在未来（含顺延情形），两轮足够。
export function nextResetTimestampMs(resetDay, resetTime, timezone, now = Date.now()) {
  const day = Number(resetDay) || 0;
  if (day < 1 || day > 31) return null;

  const match = String(resetTime || '00:00:00').match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  const hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  const second = match ? Number(match[3] || 0) : 0;

  const tz = String(timezone || '').trim();

  // 把目标时区的墙上时间 (y, m, d, hour, minute, second) 换算成 UTC 毫秒
  const wallToUtcMs = (y, m, d) => {
    if (!tz) {
      return new Date(y, m - 1, d, hour, minute, second).getTime();
    }
    try {
      const guessUtc = Date.UTC(y, m - 1, d, hour, minute, second);
      let offset = getTimezoneOffsetMs(guessUtc, tz);
      let utcMs = guessUtc - offset;
      offset = getTimezoneOffsetMs(utcMs, tz);
      utcMs = guessUtc - offset;
      return utcMs;
    } catch (_) {
      return NaN;
    }
  };

  // 当前在目标时区的年月
  let curYear;
  let curMonth;
  if (!tz) {
    const d = new Date(now);
    curYear = d.getFullYear();
    curMonth = d.getMonth() + 1;
  } else {
    try {
      const parts = getZonedWallParts(now, tz);
      curYear = Number(parts.year);
      curMonth = Number(parts.month);
    } catch (_) {
      const d = new Date(now);
      curYear = d.getFullYear();
      curMonth = d.getMonth() + 1;
    }
  }

  // 候选：本月与下月（reset_day 超当月天数时顺延下月 1 号）
  for (let add = 0; add < 2; add++) {
    const total = curMonth - 1 + add;
    const y = curYear + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12 + 1;
    const dim = daysInUtcMonth(y, m);
    let ry = y;
    let rm = m;
    let rd = day;
    if (day > dim) {
      const nt = m + 1;
      ry = nt > 12 ? y + 1 : y;
      rm = nt > 12 ? 1 : nt;
      rd = 1;
    }
    const ms = wallToUtcMs(ry, rm, rd);
    if (Number.isFinite(ms) && ms > now) {
      return ms;
    }
  }
  return null;
}

// 距下次重置还有几天（向上取整）；不重置返回 null。前端卡片在用。
export function daysUntilNextReset(resetDay, resetTime, timezone, now = Date.now()) {
  const ms = nextResetTimestampMs(resetDay, resetTime, timezone, now);
  return ms === null ? null : Math.ceil((ms - now) / 86400000);
}
