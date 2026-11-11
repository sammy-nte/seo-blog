import type { ParsedCsv } from './parseCsv'
import { findMetricCandidates } from './metricCandidates'
import { calculateMetricStatistics } from './metricStatistics'
import type { SuggestionPayload } from '../../shared/utils/suggestions'

function roundPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === 'number' ? Number(item.toFixed(2)) : item
  )) as T
}

export function prepareSuggestions(dataset: ParsedCsv): SuggestionPayload {
  return {
    dataset: {
      fileName: dataset.fileName,
      rowCount: dataset.rowCount,
      columnNames: dataset.headers,
      entityColumnCandidate: null,
      sampleRows: dataset.preview
    },
    metricCandidates: findMetricCandidates(dataset.headers, dataset.rows).map((candidate) => {
      const { rankedRows: _rankedRows, ...statistics } = calculateMetricStatistics(dataset.rows, candidate)
      return {
        column: candidate.column,
        kind: candidate.kind,
        unit: candidate.unit,
        validCount: candidate.validCount,
        missingCount: candidate.missingCount,
        invalidCount: candidate.invalidCount,
        completeness: Number(candidate.completeness.toFixed(4)),
        rangeCount: candidate.rangeCount,
        inconsistentUnitCount: candidate.inconsistentUnitCount,
        example: candidate.example,
        potentialTotalAllowed: candidate.canSum,
        potentialTopTenShareAllowed: candidate.canCalculateTopShare,
        potentialStatistics: roundPayload(statistics)
      }
    }),
    interpretation: 'These are potential calculations from the data. AI must decide which statistics are meaningful to present.'
  }
}
