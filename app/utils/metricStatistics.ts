import type { CsvRow } from "./parseCsv";
import { parseNumericValue, type MetricCandidate } from "./metricCandidates";

export interface MetricStatistics {
  validCount: number;
  hasRanges: boolean;
  total?: number;
  boundedTotal?: { minimum: number; maximum: number };
  average?: number;
  boundedAverage?: { minimum: number; maximum: number };
  minimum: number;
  maximum: number;
  boundedMinimum?: number;
  boundedMaximum?: number;
  topRanked: { label: string; value: number } | null;
  estimatedRanking: boolean;
  topRankedIsDefinitive: boolean;
  topTenShare?: number;
  rankedRows: Array<{
    row: CsvRow;
    value?: number;
    lowerBound?: number;
    upperBound?: number;
    isRange: boolean;
    isValid: boolean;
  }>;
}

export function calculateMetricStatistics(
  rows: CsvRow[],
  candidate: MetricCandidate,
  labelColumn?: string,
): MetricStatistics {
  const parsedRows = rows.map((row) => {
    const parsed = parseNumericValue(row[candidate.column] ?? "");
    if (!parsed || parsed.unit !== candidate.unit)
      return { row, isRange: false, isValid: false };
    return {
      row,
      value: parsed.value,
      lowerBound: parsed.lowerBound,
      upperBound: parsed.upperBound,
      isRange: parsed.isRange,
      isValid: true,
    };
  });
  const rankedRows = parsedRows.sort((a, b) => {
    if (a.isValid !== b.isValid) return a.isValid ? -1 : 1;
    return (
      (b.value ?? Number.NEGATIVE_INFINITY) -
      (a.value ?? Number.NEGATIVE_INFINITY)
    );
  });
  const validRows = rankedRows.filter((item) => item.isValid);
  const values = validRows.map((item) => item.value!);
  const hasRanges = validRows.some((item) => item.isRange);
  const lowerTotal = validRows.reduce((sum, item) => sum + item.lowerBound!, 0);
  const upperTotal = validRows.reduce((sum, item) => sum + item.upperBound!, 0);
  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const total =
    candidate.canSum && !hasRanges
      ? values.reduce((sum, value) => sum + value, 0)
      : undefined;
  const topTenTotal = candidate.canCalculateTopShare
    ? values.slice(0, 10).reduce((sum, value) => sum + value, 0)
    : undefined;
  return {
    validCount: values.length,
    hasRanges,
    ...(total === undefined ? {} : { total }),
    ...(candidate.canSum && hasRanges
      ? { boundedTotal: { minimum: lowerTotal, maximum: upperTotal } }
      : {}),
    ...(!hasRanges ? { average } : {}),
    ...(hasRanges
      ? {
          boundedAverage: {
            minimum: values.length ? lowerTotal / values.length : 0,
            maximum: values.length ? upperTotal / values.length : 0,
          },
        }
      : {}),
    minimum: hasRanges
      ? Math.min(...validRows.map((item) => item.lowerBound!))
      : values.length
        ? Math.min(...values)
        : 0,
    maximum: hasRanges
      ? Math.max(...validRows.map((item) => item.upperBound!))
      : values.length
        ? Math.max(...values)
        : 0,
    ...(hasRanges
      ? {
          boundedMinimum: Math.min(
            ...validRows.map((item) => item.lowerBound!),
          ),
          boundedMaximum: Math.max(
            ...validRows.map((item) => item.upperBound!),
          ),
        }
      : {}),
    topRanked: validRows[0]
      ? {
          label: labelColumn ? (validRows[0].row[labelColumn] ?? "") : "",
          value: validRows[0].value!,
        }
      : null,
    estimatedRanking: hasRanges,
    topRankedIsDefinitive: !hasRanges,
    ...(topTenTotal !== undefined && total && total > 0
      ? { topTenShare: topTenTotal / total }
      : {}),
    rankedRows,
  };
}
