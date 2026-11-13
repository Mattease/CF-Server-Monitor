export function isDisabledProbeMetric(value) {
  return value === false || value === 'false';
}

export const BILLING_CYCLES = Object.freeze([
  { value: 'month', months: 1, labelZh: '月', labelEn: 'Monthly', shortLabelZh: '月', shortLabelEn: 'M', labelEs: 'Mensual', shortLabelEs: 'mes', labelZhTw: '月', shortLabelZhTw: '月' },
  { value: 'quarter', months: 3, labelZh: '季', labelEn: 'Quarterly', shortLabelZh: '季', shortLabelEn: 'Q', labelEs: 'Trimestral', shortLabelEs: 'trim', labelZhTw: '季', shortLabelZhTw: '季' },
  { value: 'half_year', months: 6, labelZh: '半年', labelEn: 'Half-yearly', shortLabelZh: '半年', shortLabelEn: 'HY', labelEs: 'Semestral', shortLabelEs: 'sem', labelZhTw: '半年', shortLabelZhTw: '半年' },
  { value: 'year', months: 12, labelZh: '年', labelEn: 'Yearly', shortLabelZh: '年', shortLabelEn: 'Y', labelEs: 'Anual', shortLabelEs: 'año', labelZhTw: '年', shortLabelZhTw: '年' },
  { value: 'two_years', months: 24, labelZh: '两年', labelEn: 'Two years', shortLabelZh: '2年', shortLabelEn: '2Y', labelEs: 'Dos años', shortLabelEs: '2 años', labelZhTw: '兩年', shortLabelZhTw: '2年' },
  { value: 'three_years', months: 36, labelZh: '三年', labelEn: 'Three years', shortLabelZh: '3年', shortLabelEn: '3Y', labelEs: 'Tres años', shortLabelEs: '3 años', labelZhTw: '三年', shortLabelZhTw: '3年' },
  { value: 'four_years', months: 48, labelZh: '四年', labelEn: 'Four years', shortLabelZh: '4年', shortLabelEn: '4Y', labelEs: 'Cuatro años', shortLabelEs: '4 años', labelZhTw: '四年', shortLabelZhTw: '4年' },
  { value: 'five_years', months: 60, labelZh: '五年', labelEn: 'Five years', shortLabelZh: '5年', shortLabelEn: '5Y', labelEs: 'Cinco años', shortLabelEs: '5 años', labelZhTw: '五年', shortLabelZhTw: '5年' }
]);

export const CURRENCY_OPTIONS = Object.freeze([
  { symbol: '$', nameZh: '美元', nameEn: 'US Dollar', nameEs: 'Dólar estadounidense' },
  { symbol: '¥', nameZh: '人民币', nameEn: 'Chinese Yuan', nameEs: 'Yuan chino' },
  { symbol: '€', nameZh: '欧元', nameEn: 'Euro', nameEs: 'Euro' },
  { symbol: '£', nameZh: '英镑', nameEn: 'British Pound', nameEs: 'Libra esterlina' },
  { symbol: '¥JPY', nameZh: '日元', nameEn: 'Japanese Yen', nameEs: 'Yen japonés' },
  { symbol: 'HK$', nameZh: '港币', nameEn: 'Hong Kong Dollar', nameEs: 'Dólar de Hong Kong' },
  { symbol: 'A$', nameZh: '澳元', nameEn: 'Australian Dollar', nameEs: 'Dólar australiano' },
  { symbol: 'C$', nameZh: '加拿大元', nameEn: 'Canadian Dollar', nameEs: 'Dólar canadiense' },
  { symbol: 'S$', nameZh: '新加坡元', nameEn: 'Singapore Dollar', nameEs: 'Dólar de Singapur' },
  { symbol: 'NZ$', nameZh: '新西兰元', nameEn: 'New Zealand Dollar', nameEs: 'Dólar neozelandés' },
  { symbol: '₣', nameZh: '瑞士法郎', nameEn: 'Swiss Franc', nameEs: 'Franco suizo' },
  { symbol: '₩', nameZh: '韩元', nameEn: 'Korean Won', nameEs: 'Won surcoreano' },
  { symbol: '₹', nameZh: '印度卢比', nameEn: 'Indian Rupee', nameEs: 'Rupia india' },
  { symbol: '฿', nameZh: '泰铢', nameEn: 'Thai Baht', nameEs: 'Baht tailandés' },
  { symbol: '₫', nameZh: '越南盾', nameEn: 'Vietnamese Dong', nameEs: 'Dong vietnamita' },
  { symbol: '₱', nameZh: '菲律宾比索', nameEn: 'Philippine Peso', nameEs: 'Peso filipino' },
  { symbol: 'Rp', nameZh: '印尼盾', nameEn: 'Indonesian Rupiah', nameEs: 'Rupia indonesia' },
  { symbol: 'RM', nameZh: '马来西亚林吉特', nameEn: 'Malaysian Ringgit', nameEs: 'Ringgit malayo' },
  { symbol: '₺', nameZh: '土耳其里拉', nameEn: 'Turkish Lira', nameEs: 'Lira turca' },
  { symbol: '₪', nameZh: '以色列新谢克尔', nameEn: 'Israeli Shekel', nameEs: 'Séquel israelí' },
  { symbol: '৳', nameZh: '孟加拉塔卡', nameEn: 'Bangladeshi Taka', nameEs: 'Taka bangladesí' },
  { symbol: '₨', nameZh: '巴基斯坦卢比', nameEn: 'Pakistani Rupee', nameEs: 'Rupia pakistaní' },
  { symbol: 'LKR', nameZh: '斯里兰卡卢比', nameEn: 'Sri Lankan Rupee', nameEs: 'Rupia de Sri Lanka' },
  { symbol: '₮', nameZh: '蒙古图格里克', nameEn: 'Mongolian Tugrik', nameEs: 'Tugrik mongol' },
  { symbol: '₽', nameZh: '卢布', nameEn: 'Russian Ruble', nameEs: 'Rublo ruso' },
  { symbol: 'R$', nameZh: '巴西雷亚尔', nameEn: 'Brazilian Real', nameEs: 'Real brasileño' },
  { symbol: 'kr', nameZh: '克朗', nameEn: 'Krona (SEK/NOK/DKK)', nameEs: 'Corona (SEK/NOK/DKK)' },
  { symbol: 'zł', nameZh: '波兰兹罗提', nameEn: 'Polish Zloty', nameEs: 'Esloti polaco' },
  { symbol: '₴', nameZh: '乌克兰格里夫纳', nameEn: 'Ukrainian Hryvnia', nameEs: 'Grivna ucraniana' },
  { symbol: '₸', nameZh: '哈萨克坦戈', nameEn: 'Kazakhstani Tenge', nameEs: 'Tenge kazajo' },
  { symbol: 'R', nameZh: '南非兰特', nameEn: 'South African Rand', nameEs: 'Rand sudafricano' },
  { symbol: '₦', nameZh: '尼日利亚奈拉', nameEn: 'Nigerian Naira', nameEs: 'Naira nigeriano' },
  { symbol: 'EGP', nameZh: '埃及镑', nameEn: 'Egyptian Pound', nameEs: 'Libra egipcia' },
  { symbol: 'د.إ', nameZh: '阿联酋迪拉姆', nameEn: 'UAE Dirham', nameEs: 'Dírham de los EAU' },
  { symbol: '﷼', nameZh: '沙特里亚尔', nameEn: 'Saudi Riyal', nameEs: 'Riyal saudí' },
  { symbol: 'Q', nameZh: '危地马拉格查尔', nameEn: 'Guatemalan Quetzal', nameEs: 'Quetzal guatemalteco' }
]);

const CYCLE_ALIASES = new Map([
  ['月', 'month'],
  ['monthly', 'month'],
  ['month', 'month'],
  ['mo', 'month'],
  ['季', 'quarter'],
  ['季度', 'quarter'],
  ['quarter', 'quarter'],
  ['quarterly', 'quarter'],
  ['半年', 'half_year'],
  ['halfyear', 'half_year'],
  ['half_year', 'half_year'],
  ['half-yearly', 'half_year'],
  ['年', 'year'],
  ['一年', 'year'],
  ['year', 'year'],
  ['yearly', 'year'],
  ['annual', 'year'],
  ['两年', 'two_years'],
  ['二年', 'two_years'],
  ['two_years', 'two_years'],
  ['2 years', 'two_years'],
  ['三年', 'three_years'],
  ['three_years', 'three_years'],
  ['3 years', 'three_years'],
  ['四年', 'four_years'],
  ['four_years', 'four_years'],
  ['4 years', 'four_years'],
  ['五年', 'five_years'],
  ['five_years', 'five_years'],
  ['5 years', 'five_years']
]);

const NORMALIZED_CURRENCIES = new Set(CURRENCY_OPTIONS.map(item => item.symbol));

export function normalizePrice(value) {
  if (value === null || value === undefined) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const numberText = raw.match(/-?[\d.,]+/)?.[0];
  if (!numberText) return '';

  const normalized = numberText.replace(/,/g, '');
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num)) return '';
  if (num === -1) return '-1';
  if (num < 0) return '';

  return num.toFixed(2);
}

export function isFreePrice(value) {
  const price = normalizePrice(value);
  return price === '-1' || price === '0.00';
}

export function normalizeCurrency(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw === '￥' ? '¥' : raw;
  for (const item of CURRENCY_OPTIONS) {
    if (item.symbol.length > 1 && normalized.startsWith(item.symbol)) {
      return item.symbol;
    }
  }

  const symbol = normalized[0];
  return NORMALIZED_CURRENCIES.has(symbol) ? symbol : '';
}

export function detectCurrencySymbol(value) {
  const raw = String(value || '');
  if (!raw) return '';
  if (raw.includes('￥')) return '¥';

  for (const item of CURRENCY_OPTIONS) {
    if (item.symbol.length > 1 && raw.includes(item.symbol)) {
      return item.symbol;
    }
  }

  return CURRENCY_OPTIONS.find(item => item.symbol.length === 1 && raw.includes(item.symbol))?.symbol || '';
}

export function detectBillingCycle(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  if (/五年|5\s*(y|yr|yrs|year|years)/i.test(raw)) return 'five_years';
  if (/四年|4\s*(y|yr|yrs|year|years)/i.test(raw)) return 'four_years';
  if (/三年|3\s*(y|yr|yrs|year|years)/i.test(raw)) return 'three_years';
  if (/(两年|二年)|2\s*(y|yr|yrs|year|years)/i.test(raw)) return 'two_years';
  if (/半年|half[-_\s]?year/i.test(raw)) return 'half_year';
  if (/季|quarter|\/q\b/i.test(raw)) return 'quarter';
  if (/年|annual|year|yr\b|\/y\b/i.test(raw)) return 'year';
  if (/月|monthly|month|mo\b|\/m\b/i.test(raw)) return 'month';

  return '';
}

export function normalizeBillingCycle(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'month';

  const direct = BILLING_CYCLES.find(item => item.value === raw);
  if (direct) return direct.value;

  return CYCLE_ALIASES.get(raw.toLowerCase()) || 'month';
}

export function getBillingCycleOption(value) {
  const normalized = normalizeBillingCycle(value);
  return BILLING_CYCLES.find(item => item.value === normalized) || BILLING_CYCLES[0];
}

export function isEnabledFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function parseDateOnly(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function daysInUtcMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toDateString(year, month, day) {
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function addBillingCycleToDate(dateString, billingCycle) {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return String(dateString || '').trim();

  const monthsToAdd = getBillingCycleOption(billingCycle).months;
  const zeroBasedMonth = parsed.month - 1 + monthsToAdd;
  const year = parsed.year + Math.floor(zeroBasedMonth / 12);
  const month = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  const day = Math.min(parsed.day, daysInUtcMonth(year, month));

  return toDateString(year, month, day);
}

function utcDateStringWithOffset(now = Date.now(), offsetDays = 0) {
  const date = new Date(now + (Number(offsetDays) || 0) * 86400000);
  return toDateString(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function renewExpireDateIfNeeded(expireDate, billingCycle, autoRenewal, now = Date.now(), renewBeforeDays = 0) {
  const original = String(expireDate || '').trim();
  if (!original || !parseDateOnly(original) || !isEnabledFlag(autoRenewal)) {
    return { expire_date: original, renewed: false };
  }

  let nextDate = original;
  const renewalDate = utcDateStringWithOffset(now, renewBeforeDays);
  let renewed = false;
  let guard = 0;

  while (nextDate <= renewalDate && guard < 1200) {
    nextDate = addBillingCycleToDate(nextDate, billingCycle);
    renewed = true;
    guard++;
  }

  return { expire_date: nextDate, renewed };
}

// ---- 到期时刻（ISO 日期时间，schema 8）：与后端 src/utils/serverBilling.js 同款逻辑 ----
// expire_at 是完整 ISO 日期时间，可带数字时区偏移（如 2027-04-10T15:30:00+08:00）；
// 无偏移时按本地墙上时间理解。老数据只有 expire_date 时按当天 00:00 处理。
const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

function parseExpireAtParts(value) {
  const match = String(value || '').trim().match(ISO_DATETIME_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || '00');
  const offsetRaw = match[7] || '';

  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    probe.getUTCHours() !== hour ||
    probe.getUTCMinutes() !== minute ||
    probe.getUTCSeconds() !== second
  ) {
    return null;
  }

  let offsetMinutes = null;
  let offsetText = '';
  if (offsetRaw === 'Z') {
    offsetMinutes = 0;
    offsetText = 'Z';
  } else if (offsetRaw) {
    const offsetMatch = offsetRaw.match(/^([+-])(\d{2}):?(\d{2})$/);
    if (!offsetMatch) return null;
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    offsetMinutes = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]));
    if (Math.abs(offsetMinutes) > 14 * 60) return null;
    offsetText = `${offsetMatch[1]}${offsetMatch[2]}:${offsetMatch[3]}`;
  }

  return { year, month, day, hour, minute, second, offsetMinutes, offsetText };
}

function formatTimePart(hour, minute, second) {
  return [hour, minute, second].map(value => String(value).padStart(2, '0')).join(':');
}

export function parseExpireAt(value) {
  const parts = parseExpireAtParts(value);
  if (!parts) return null;
  const canonical = `${toDateString(parts.year, parts.month, parts.day)}T${formatTimePart(parts.hour, parts.minute, parts.second)}${parts.offsetText || ''}`;
  const ms = Date.parse(canonical);
  return Number.isFinite(ms) ? ms : null;
}

export function resolveExpireAt(server) {
  const raw = String(server?.expire_at || '').trim();
  if (raw && parseExpireAt(raw) !== null) return raw;

  const date = String(server?.expire_date || '').trim();
  if (!parseDateOnly(date)) return '';
  return `${date}T00:00:00`;
}

function addBillingCycleToDateTime(isoString, billingCycle) {
  const parts = parseExpireAtParts(isoString);
  if (!parts) return String(isoString || '').trim();

  const monthsToAdd = getBillingCycleOption(billingCycle).months;
  const zeroBasedMonth = parts.month - 1 + monthsToAdd;
  const year = parts.year + Math.floor(zeroBasedMonth / 12);
  const month = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  // 保留原来的时分秒，只加月数；日期溢出时按当月最后一天 clamp
  const day = Math.min(parts.day, daysInUtcMonth(year, month));

  return `${toDateString(year, month, day)}T${formatTimePart(parts.hour, parts.minute, parts.second)}${parts.offsetText || ''}`;
}

export function renewExpireDateTimeIfNeeded(expireAt, billingCycle, autoRenewal, now = Date.now(), renewBeforeDays = 0) {
  const original = String(expireAt || '').trim();
  if (!original || parseExpireAt(original) === null || !isEnabledFlag(autoRenewal)) {
    return { expire_at: original, renewed: false };
  }

  let next = original;
  let nextMs = parseExpireAt(next);
  const thresholdMs = now + (Number(renewBeforeDays) || 0) * 86400000;
  let renewed = false;
  let guard = 0;

  while (nextMs !== null && nextMs <= thresholdMs && guard < 1200) {
    next = addBillingCycleToDateTime(next, billingCycle);
    nextMs = parseExpireAt(next);
    renewed = true;
    guard++;
  }

  return { expire_at: next, renewed };
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
