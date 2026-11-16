// 前端计费/时间工具。通用计费逻辑（价格、货币、周期、到期续期、
// expire_at 解析）唯一实现在 src/shared/serverBilling.js，此处转发导出；
// 流量重置时间计算的唯一实现在 src/shared/resetTime.js，此处转发导出；
// 本文件只留前端专属部分：datetime-local 换算、本地化标签、价格格式化。
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

import {
  getTimezoneOffsetMs,
  getZonedWallParts
} from '../../shared/resetTime.js';

export { daysUntilNextReset } from '../../shared/resetTime.js';

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
// daysUntilNextReset 的唯一实现已移到 src/shared/resetTime.js（文件顶部转发导出），
// 与 Worker 共用同一份算法；此处不再保留拷贝。

