import { z } from 'zod'

export const statisticLabels = {
  validCount: 'Records with usable values',
  total: 'Total',
  average: 'Average',
  minimum: 'Minimum',
  maximum: 'Maximum',
  boundedMinimum: 'Lowest reported bound',
  boundedMaximum: 'Highest reported bound',
  boundedTotal: 'Bounded total',
  boundedAverage: 'Bounded average',
  topTenShare: 'Top 10 share of total'
} as const

export type StatisticKey = keyof typeof statisticLabels
const statisticKeySchema = z.enum(Object.keys(statisticLabels) as [StatisticKey, ...StatisticKey[]])
const columnName = z.string().min(1).max(500)
const count = z.number().int().nonnegative()
const bounds = z.object({ minimum: z.number(), maximum: z.number() })

const statisticsSchema = z.object({
  validCount: count,
  hasRanges: z.boolean(),
  total: z.number().optional(),
  average: z.number().optional(),
  minimum: z.number(),
  maximum: z.number(),
  boundedMinimum: z.number().optional(),
  boundedMaximum: z.number().optional(),
  boundedTotal: bounds.optional(),
  boundedAverage: bounds.optional(),
  topTenShare: z.number().min(0).max(1).optional(),
  topRanked: z.object({ label: z.string(), value: z.number() }).nullable(),
  estimatedRanking: z.boolean(),
  topRankedIsDefinitive: z.boolean()
})

export const suggestionPayloadSchema = z.object({
  dataset: z.object({
    fileName: z.string().min(1).max(500),
    rowCount: count.min(1),
    columnNames: z.array(columnName).min(1).max(200),
    entityColumnCandidate: columnName.nullable(),
    sampleRows: z.array(z.record(columnName, z.string().max(10000))).min(1).max(10)
  }),
  metricCandidates: z.array(z.object({
    column: columnName,
    kind: z.enum(['numeric', 'percentage']),
    unit: z.enum(['plain', 'currency', 'percentage']),
    validCount: count,
    missingCount: count,
    invalidCount: count,
    completeness: z.number().min(0).max(1),
    rangeCount: count,
    inconsistentUnitCount: count,
    example: z.string().max(10000),
    potentialTotalAllowed: z.boolean(),
    potentialTopTenShareAllowed: z.boolean(),
    potentialStatistics: statisticsSchema
  })).min(1).max(200),
  interpretation: z.string().max(1000)
}).superRefine((payload, ctx) => {
  const columns = new Set(payload.dataset.columnNames)
  const metrics = payload.metricCandidates.map((metric) => metric.column)
  const badReferences = metrics.some((name) => !columns.has(name))
    || payload.dataset.sampleRows.some((row) => Object.keys(row).some((name) => !columns.has(name)))
    || (payload.dataset.entityColumnCandidate !== null && !columns.has(payload.dataset.entityColumnCandidate))
  if (badReferences || columns.size !== payload.dataset.columnNames.length || new Set(metrics).size !== metrics.length) {
    ctx.addIssue({ code: 'custom', message: 'Payload columns must be unique and match the dataset headers.' })
  }
  for (const metric of payload.metricCandidates) {
    if (metric.validCount !== metric.potentialStatistics.validCount
      || metric.validCount + metric.missingCount + metric.invalidCount + metric.inconsistentUnitCount !== payload.dataset.rowCount
      || metric.rangeCount > metric.validCount) {
      ctx.addIssue({ code: 'custom', message: 'Metric quality counts are inconsistent.' })
    }
  }
})

export type SuggestionPayload = z.infer<typeof suggestionPayloadSchema>

// These keys are available calculations, not an assessment of their meaning.
export function availableStatisticKeys(metric: SuggestionPayload['metricCandidates'][number]): StatisticKey[] {
  const stats = metric.potentialStatistics
  return (Object.keys(statisticLabels) as StatisticKey[]).filter((key) => {
    if (stats[key] === undefined) return false
    if (stats.hasRanges && ['total', 'average', 'minimum', 'maximum', 'topTenShare'].includes(key)) return false
    if (!stats.hasRanges && key.startsWith('bounded')) return false
    if ((key === 'total' || key === 'boundedTotal') && !metric.potentialTotalAllowed) return false
    if (key === 'topTenShare' && !metric.potentialTopTenShareAllowed) return false
    return true
  })
}

export const recommendationSchema = z.strictObject({
  entityColumn: columnName.nullable(),
  entityReason: z.string().min(1).max(600),
  rankingMetric: columnName.nullable(),
  metricReason: z.string().min(1).max(600),
  direction: z.enum(['asc', 'desc']),
  directionReason: z.string().min(1).max(600),
  statistics: z.array(z.strictObject({ key: statisticKeySchema, reason: z.string().min(1).max(600) })).max(10),
  warnings: z.array(z.string().min(1).max(600)).max(5)
})
export type Recommendation = z.infer<typeof recommendationSchema>

export function validateRecommendation(value: unknown, payload: SuggestionPayload): Recommendation {
  const result = recommendationSchema.parse(value)
  if (result.entityColumn !== null && !payload.dataset.columnNames.includes(result.entityColumn)) {
    throw new Error('The recommended entity column is not in this dataset.')
  }
  const metric = payload.metricCandidates.find((item) => item.column === result.rankingMetric)
  if (result.rankingMetric !== null && !metric) throw new Error('The recommended metric is not a numerical candidate.')
  const available = metric ? availableStatisticKeys(metric) : []
  const keys = result.statistics.map((statistic) => statistic.key)
  if (new Set(keys).size !== keys.length || keys.some((key) => !available.includes(key))) {
    throw new Error('The recommendation selected statistics that are unavailable for this metric.')
  }
  return result
}
