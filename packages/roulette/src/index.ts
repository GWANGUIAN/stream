export type { RouletteEngineOptions, RouletteListener } from './engine'
export { createRouletteEngine, RouletteEngine } from './engine'
export type { PaletteOptions } from './palette'
export { buildPalette, colorForIndex } from './palette'
export type {
  DonationInput,
  DonationRule,
  RegisterAccepted,
  RegisterMode,
  RegisterOutcome,
  RegisterRejected,
  RejectReason,
} from './rules'
export {
  DEFAULT_DONATION_RULE,
  normalizeLabel,
  REJECT_REASON_LABELS,
  resolveDonation,
} from './rules'
export type { Segment, TargetRotationOptions } from './spin'
export { buildSegments, pickWeightedIndex, targetRotation } from './spin'
export type { PlatformTerms } from './terms'
export { PLATFORM_TERMS, termsFor } from './terms'
export type {
  ItemSource,
  LogEntry,
  LogKind,
  RehearsalDonationInput,
  RouletteItem,
  RouletteSnapshot,
  SpinResult,
  TimerState,
  WeightMode,
  WinnerAction,
} from './types'
