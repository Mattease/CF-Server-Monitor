// 前端计费/时间工具。通用计费逻辑（价格、货币、周期、到期续期、
// expire_at 解析）唯一实现在 src/shared/serverBilling.js，此处转发导出；
// 本文件只留前端专属部分：datetime-local 换算、本地化标签、价格格式化、
// 流量重置倒计时。
import {
  daysInUtcMonth,
  detectBillingCycle,
  detectCurrencySymbol,
  formatTimePart,
  getBillingCycleOption,
  normalizeCurrency,
  normalizePrice,
  parseExpireAt,
  parseExpireAtParts,
  toDateString
} from '../../shared/serverBilling.js';

export {
  BILLING_CYCLES,
  CURRENCY_OPTIONS,
  daysInUtcMonth,
  detectBillingCycle,
  detectCurrencySymbol,
  formatTimePart,
  getBillingCycleOption,
  isEnabledFlag,
  normalizeBillingCycle,
  normalizeCurrency,
  normalizePrice,
  parseExpireAt,
  parseExpireAtParts,
  renewExpireDateIfNeeded,
  renewExpireDateTimeIfNeeded,
  resolveExpireAt,
  toDateString
} from '../../shared/serverBilling.js';

export function isDisabledProbeMetric(value) {
  return value === false || value === 'false';
}

export function isFreePrice(value) {
  const price = normalizePrice(value);
  return price === '-1' || price === '0.00';
}

// ---- ISO 日期时间与 datetime-local 输入框、计费时区之间的换算 ----
// isoToLocalInput：把存储的 ISO（带时区偏移）换算成所选时区的墙上时间 "YYYY-MM-DDTHH:MM:SS"；
// tz 为空表示浏览器本地时区。localInputToIso：反向，把墙上时间按所选时区拼回带偏移的 ISO。
const pad2 = (value) => String(value).padStart(2, '0');

function getZonedWallParts(timestamp, timeZone) {
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

function getTimezoneOffsetMs(timestamp, timeZone) {
  const parts = getZonedWallParts(timestamp, timeZone);
  const wallAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return wallAsUtc - timestamp;
}

function formatTimezoneOffset(offsetMs) {
  const sign = offsetMs < 0 ? '-' : '+';
  const abs = Math.abs(offsetMs);
  return `${sign}${pad2(Math.floor(abs / 3600000))}:${pad2(Math.floor((abs % 3600000) / 60000))}`;
}

export function isoToLocalInput(iso, timeZone) {
  const raw = String(iso || '').trim();
  if (!raw) return '';
  // 无时区偏移的字符串本身就是墙上时间（如旧 expire_date 拼出的
  // YYYY-MM-DDT00:00:00），直接返回，不要经浏览器本地时区解析后再跨时区换算，
  // 否则会无故偏移（如北京时间解析再转纽约会倒退 12 小时）。
  const rawParts = parseExpireAtParts(raw);
  if (rawParts && !rawParts.offsetText) {
    return `${toDateString(rawParts.year, rawParts.month, rawParts.day)}T${formatTimePart(rawParts.hour, rawParts.minute, rawParts.second)}`;
  }
  const ms = parseExpireAt(raw);
  if (ms === null) {
    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    return dateOnly ? `${dateOnly}T00:00:00` : '';
  }

  const tz = String(timeZone || '').trim();
  if (!tz) {
    const date = new Date(ms);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  try {
    const parts = getZonedWallParts(ms, tz);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  } catch (_) {
    const date = new Date(ms);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }
}

export function localInputToIso(local, timeZone) {
  const match = String(local || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return '';
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const hour = match[4] || '00';
  const minute = match[5] || '00';
  const second = match[6] || '00';

  const tz = String(timeZone || '').trim();
  if (!tz) {
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (Number.isNaN(date.getTime())) return '';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${formatTimezoneOffset(-date.getTimezoneOffset() * 60000)}`;
  }

  try {
    // 先按 UTC 拼墙上时间，再用该时区在该日期的偏移量反推（算两次，覆盖夏令时边界）
    const guessUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    let offset = getTimezoneOffsetMs(guessUtc, tz);
    let utcMs = guessUtc - offset;
    offset = getTimezoneOffsetMs(utcMs, tz);
    utcMs = guessUtc - offset;
    if (Number.isNaN(utcMs)) return '';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${formatTimezoneOffset(offset)}`;
  } catch (_) {
    return '';
  }
}

const OPTION_FIELD_LANGUAGE_SUFFIX = Object.freeze({ zh: 'Zh', 'zh-TW': 'ZhTw', en: 'En', es: 'Es' });

export function getLocalizedOptionField(option, field, lang) {
  return option?.[`${field}${OPTION_FIELD_LANGUAGE_SUFFIX[lang] || 'En'}`] ?? option?.[`${field}En`] ?? '';
}

const FREE_PRICE_LABELS = Object.freeze({ zh: '免费', 'zh-TW': '免費', en: 'Free', es: 'Gratis' });

export function formatBillingPrice(server, lang = 'zh') {
  const price = normalizePrice(server?.price);
  if (!price) return '';
  if (isFreePrice(price)) return FREE_PRICE_LABELS[lang] || FREE_PRICE_LABELS.en;

  const currency = normalizeCurrency(server?.currency || detectCurrencySymbol(server?.price));
  const cycle = getBillingCycleOption(detectBillingCycle(server?.price) || server?.billing_cycle);
  const cycleLabel = getLocalizedOptionField(cycle, 'shortLabel', lang);

  return `${currency}${price}/${cycleLabel}`;
}

// ---- 流量重置倒计时 ----
// daysUntilNextReset：直接用面板里已配好的 reset_day / reset_time / timezone，
// 算下次重置还有几天（向上取整）。reset_day 为 0 或空表示不重置，返回 null。
// reset_day 超出当月天数时顺延到下月 1 号（与探针的周期算法一致），时刻仍用 resetTime。
export function daysUntilNextReset(resetDay, resetTime, timezone, now = Date.now()) {
  const day = Number(resetDay) || 0;
  if (day < 1 || day > 31) return null;

  const match = String(resetTime || '00:00:00').match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  const hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  const second = match ? Number(match[3] || 0) : 0;

  const tz = String(timezone || '').trim();

  // 把目标时区的墙上时间 (y, m, d, h, mi, s) 换算成 UTC 毫秒
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
      return Math.ceil((ms - now) / 86400000);
    }
  }
  return null;
}

