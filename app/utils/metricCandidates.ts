import type { CsvRow } from './parseCsv'

export type NumericUnit = 'currency' | 'percentage' | 'plain'

export interface ParsedNumericValue {
  value: number
  lowerBound: number
  upperBound: number
  unit: NumericUnit
  isRange: boolean
  raw: string
}

export interface MetricCandidate {
  column: string
  kind: 'numeric' | 'percentage'
  unit: NumericUnit
  validCount: number
  /** Blank cells only; excludes invalid numbers and inconsistent units. */
  missingCount: number
  completeness: number
  /** Non-blank cells that cannot be parsed as an exact number or valid range. */
  invalidCount: number
  rangeCount: number
  inconsistentUnitCount: number
  example: string
  canSum: boolean
  canCalculateTopShare: boolean
}

const range_value = /^\s*(.+?)\s*[-–—]\s*(.+?)\s*$/i
const numeric_value = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*[kmb])?$/i

function multiplier(value: string): number {
  const suffix = value.trim().slice(-1).toLowerCase()
  return suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : 1
}

function parseExactNumericValue(original: string): ParsedNumericValue | null {
  if (!original) return null
  const isNegative = /^\(.*\)$/.test(original)
  const unwrapped = isNegative ? original.slice(1, -1).trim() : original
  const unit: NumericUnit = /%|percent/i.test(unwrapped)
    ? 'percentage'
    : /^[£$€¥]/.test(unwrapped) ? 'currency' : 'plain'
  const clean = unwrapped
    .replace(/^[£$€¥]\s*/, '')
    .replace(/\s*(?:%|percent)\s*$/i, '')
    .trim()
  if (!numeric_value.test(clean)) return null
  const value = Number(clean.replaceAll(',', '').replace(/[kmb]$/i, '')) * multiplier(clean) * (isNegative ? -1 : 1)
  return Number.isFinite(value)
    ? { value, lowerBound: value, upperBound: value, unit, isRange: false, raw: original }
    : null
}

export function parseNumericValue(raw: string): ParsedNumericValue | null {
  const original = raw.trim()
  if (!original) return null
  const exact = parseExactNumericValue(original)
  if (exact) return exact

  const range = range_value.exec(original)
  if (range) {
    const lower = parseExactNumericValue(range[1]!.trim())
    const upper = parseExactNumericValue(range[2]!.trim())
    if (!lower || !upper || lower.unit !== upper.unit) return null
    if (lower.value > upper.value) return null
    return {
      value: (lower.value + upper.value) / 2,
      lowerBound: lower.value,
      upperBound: upper.value,
      unit: lower.unit,
      isRange: true,
      raw: original
    }
  }
  return null
}

export function findMetricCandidates(headers: string[], rows: CsvRow[]): MetricCandidate[] {
  return headers.flatMap((column) => {
    const values = rows.map((row) => row[column]?.trim() ?? '')
    const parsed = values.map(parseNumericValue)
    const valid = parsed.filter((item): item is ParsedNumericValue => item !== null)
    if (valid.length < 2) return []

    const nonBlankCount = values.filter(Boolean).length
    const unit = valid[0]!.unit
    const inconsistentUnitCount = valid.filter((item) => item.unit !== unit).length
    const consistent = valid.filter((item) => item.unit === unit)
    const rangeCount = consistent.filter((item) => item.isRange).length
    const canSum = unit !== 'percentage'
    return [{
      column,
      kind: (unit === 'percentage' ? 'percentage' : 'numeric') as MetricCandidate['kind'],
      unit,
      validCount: consistent.length,
      missingCount: rows.length - nonBlankCount,
      completeness: rows.length ? consistent.length / rows.length : 0,
      invalidCount: nonBlankCount - valid.length,
      rangeCount,
      inconsistentUnitCount,
      example: valid[0]!.raw,
      canSum,
      canCalculateTopShare: canSum && rangeCount === 0 && inconsistentUnitCount === 0 && consistent.every((item) => item.value >= 0)
    }]
  }).sort((a, b) => b.completeness - a.completeness || b.validCount - a.validCount)
}
