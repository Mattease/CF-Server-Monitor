// 流量重置时间：共享实现（src/shared/resetTime.js）回归测试。
// 核心断言：2026-11-17 收敛后，共享实现的 daysUntilNextReset 必须与收敛前
// 前端 server.js 的旧实现（下方 legacy 拷贝，逐字复制自 git HEAD 55c7ab0）
// 在全量组合下结果完全一致；nextResetTimestampMs 必须与天数口径自洽，
// 且关键已知案例（跨月顺延 P0-2a、真实机器配置、恰在重置点）精确命中。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextResetTimestampMs, daysUntilNextReset } from '../src/shared/resetTime.js';
import { daysUntilNextReset as daysUntilFromFrontendUtil } from '../src/frontend/utils/server.js';

// ---- legacy 旧实现（收敛前 src/frontend/utils/server.js，逐字复制，仅改名） ----
function legacyDaysInUtcMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function legacyGetZonedWallParts(timestamp, timeZone) {
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
function legacyGetTimezoneOffsetMs(timestamp, timeZone) {
  const parts = legacyGetZonedWallParts(timestamp, timeZone);
  const wallAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return wallAsUtc - timestamp;
}
function legacyDaysUntilNextReset(resetDay, resetTime, timezone, now = Date.now()) {
  const day = Number(resetDay) || 0;
  if (day < 1 || day > 31) return null;

  const match = String(resetTime || '00:00:00').match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  const hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  const second = match ? Number(match[3] || 0) : 0;

  const tz = String(timezone || '').trim();

  const wallToUtcMs = (y, m, d) => {
    if (!tz) {
      return new Date(y, m - 1, d, hour, minute, second).getTime();
    }
    try {
      const guessUtc = Date.UTC(y, m - 1, d, hour, minute, second);
      let offset = legacyGetTimezoneOffsetMs(guessUtc, tz);
      let utcMs = guessUtc - offset;
      offset = legacyGetTimezoneOffsetMs(utcMs, tz);
      utcMs = guessUtc - offset;
      return utcMs;
    } catch (_) {
      return NaN;
    }
  };

  let curYear;
  let curMonth;
  if (!tz) {
    const d = new Date(now);
    curYear = d.getFullYear();
    curMonth = d.getMonth() + 1;
  } else {
    try {
      const parts = legacyGetZonedWallParts(now, tz);
      curYear = Number(parts.year);
      curMonth = Number(parts.month);
    } catch (_) {
      const d = new Date(now);
      curYear = d.getFullYear();
      curMonth = d.getMonth() + 1;
    }
  }

  for (let add = 0; add < 2; add++) {
    const total = curMonth - 1 + add;
    const y = curYear + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12 + 1;
    const dim = legacyDaysInUtcMonth(y, m);
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
// ---- legacy 拷贝结束 ----

const NOWS = [
  Date.UTC(2026, 0, 31, 6, 0, 0),    // 1 月 31 日（P0-2a 场景时刻）
  Date.UTC(2026, 0, 15, 12, 0, 0),
  Date.UTC(2026, 1, 27, 12, 0, 0),
  Date.UTC(2026, 1, 28, 23, 30, 0),  // 非闰年 2 月底
  Date.UTC(2027, 1, 28, 12, 0, 0),
  Date.UTC(2028, 1, 29, 12, 0, 0),   // 闰年 2 月 29 日
  Date.UTC(2026, 2, 7, 12, 0, 0),
  Date.UTC(2026, 2, 8, 8, 30, 0),    // 美国春令时切换日
  Date.UTC(2026, 3, 30, 12, 0, 0),   // 30 天月份月底
  Date.UTC(2026, 9, 31, 12, 0, 0),
  Date.UTC(2026, 10, 1, 7, 30, 0),   // 美国秋令时切换日
  Date.UTC(2026, 10, 16, 17, 25, 0), // 接近本次改动的真实时刻
  Date.UTC(2026, 11, 31, 23, 59, 59) // 年界
];
const DAYS = [0, 1, 2, 15, 28, 29, 30, 31, 32, -1, '', null, '25'];
const TIMES = ['00:00:00', '13:00:00', '23:59:53', '8:30', '8:30:15', '25:00:00', 'garbage', '', null];
const TZS = ['', 'Asia/Shanghai', 'Asia/Tokyo', 'America/New_York', 'America/Los_Angeles', 'UTC', 'Australia/Sydney', 'Pacific/Auckland'];

test('共享实现与旧实现全量组合等价，且时间戳与天数自洽', () => {
  let checked = 0;
  for (const now of NOWS) {
    for (const day of DAYS) {
      for (const time of TIMES) {
        for (const tz of TZS) {
          const label = `day=${day} time=${time} tz=${tz} now=${new Date(now).toISOString()}`;
          const legacy = legacyDaysUntilNextReset(day, time, tz, now);
          const shared = daysUntilNextReset(day, time, tz, now);
          assert.equal(shared, legacy, `days mismatch: ${label}`);
          assert.equal(daysUntilFromFrontendUtil(day, time, tz, now), legacy, `frontend re-export mismatch: ${label}`);
          const ts = nextResetTimestampMs(day, time, tz, now);
          if (legacy === null) {
            assert.equal(ts, null, `ts should be null: ${label}`);
          } else {
            assert.ok(ts !== null && ts > now, `ts must be in future: ${label}`);
            assert.equal(Math.ceil((ts - now) / 86400000), legacy, `ts/days not self-consistent: ${label}`);
            assert.ok(ts - now < 33 * 86400000, `ts too far out: ${label}`);
          }
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 10000, `battery too small: ${checked}`);
});

test('时间戳的墙上时间与配置一致（时/分/秒精确，日为重置日或顺延 1 号）', () => {
  for (const now of NOWS) {
    for (const tz of ['Asia/Shanghai', 'America/New_York', 'UTC', 'Pacific/Auckland']) {
      const ts = nextResetTimestampMs(25, '13:00:00', tz, now);
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz, hour12: false, hourCycle: 'h23',
          day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).formatToParts(new Date(ts)).map(p => [p.type, p.value])
      );
      assert.equal(Number(parts.day), 25, `day: tz=${tz} now=${new Date(now).toISOString()}`);
      assert.equal(Number(parts.hour), 13);
      assert.equal(Number(parts.minute), 0);
      assert.equal(Number(parts.second), 0);
    }
  }
});

test('P0-2a 跨月顺延：1 月 31 日已过重置点、reset_day=31 应到 3 月 1 日而非 2 月 1 日', () => {
  const now = Date.UTC(2026, 0, 31, 6, 0, 0); // 北京时间 1 月 31 日 14:00
  const ts = nextResetTimestampMs(31, '00:00:00', 'Asia/Shanghai', now);
  assert.equal(ts, Date.UTC(2026, 1, 28, 16, 0, 0)); // 3 月 1 日 00:00 CST
});

test('2 月顺延：reset_day=31 在 2 月应落到 3 月 1 日', () => {
  const ts = nextResetTimestampMs(31, '00:00:00', 'UTC', Date.UTC(2026, 1, 10, 0, 0, 0));
  assert.equal(ts, Date.UTC(2026, 2, 1, 0, 0, 0));
});

test('真实机器配置：38（25 号 13:00 上海）与 68（11 号 23:59:53 上海）', () => {
  const now = Date.UTC(2026, 10, 16, 17, 25, 0); // 北京时间 2026-11-17 01:25
  assert.equal(
    nextResetTimestampMs(25, '13:00:00', 'Asia/Shanghai', now),
    Date.UTC(2026, 10, 25, 5, 0, 0) // 2026-11-25 13:00 CST
  );
  assert.equal(
    nextResetTimestampMs(11, '23:59:53', 'Asia/Shanghai', now),
    Date.UTC(2026, 11, 11, 15, 59, 53) // 2026-12-11 23:59:53 CST
  );
});

test('恰在重置点：必须取下个月（严格大于 now）', () => {
  const now = Date.UTC(2026, 10, 16, 17, 25, 0); // 北京时间 2026-11-17 01:25:00 整
  const ts = nextResetTimestampMs(17, '01:25:00', 'Asia/Shanghai', now);
  assert.equal(ts, Date.UTC(2026, 11, 16, 17, 25, 0)); // 2026-12-17 01:25 CST
});

test('不重置：reset_day 为 0/空/越界返回 null', () => {
  const now = Date.UTC(2026, 10, 16, 17, 25, 0);
  assert.equal(nextResetTimestampMs(0, '00:00:00', 'Asia/Shanghai', now), null);
  assert.equal(nextResetTimestampMs('', '00:00:00', 'Asia/Shanghai', now), null);
  assert.equal(nextResetTimestampMs(32, '00:00:00', 'Asia/Shanghai', now), null);
  assert.equal(daysUntilNextReset(0, '00:00:00', 'Asia/Shanghai', now), null);
});
