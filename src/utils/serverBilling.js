// 后端入口：计费/时间逻辑的唯一实现在 src/shared/serverBilling.js，
// 此处仅转发导出，保持既有 import 路径不变。
export {
  detectBillingCycle,
  detectCurrencySymbol,
  isEnabledFlag,
  normalizeBillingCycle,
  normalizeCurrency,
  normalizePrice,
  parseExpireAt,
  renewExpireDateIfNeeded,
  renewExpireDateTimeIfNeeded,
  resolveExpireAt
} from '../shared/serverBilling.js';
