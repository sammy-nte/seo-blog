import { z } from "zod";
import {
  findMetricCandidates,
  parseNumericValue,
  type MetricCandidate,
} from "../../app/utils/metricCandidates";
import {
  calculateMetricStatistics,
  type MetricStatistics,
} from "../../app/utils/metricStatistics";
import {
  availableStatisticKeys,
  statisticLabels,
  type StatisticKey,
} from "./suggestions";
import type {
  ArticleAccent,
  BlogArticle,
  BlogStat,
  RankingMetric,
  RankingRow,
} from "../types/blog";

const columnNameSchema = z.string().trim().min(1).max(500);
const rowSchema = z.record(columnNameSchema, z.string().max(20_000));

export const finalGenerationRequestSchema = z
  .strictObject({
    dataset: z.strictObject({
      fileName: z.string().trim().min(1).max(500),
      headers: z.array(columnNameSchema).min(1).max(200),
      rows: z.array(rowSchema).min(1).max(100_000),
    }),
    confirmation: z.strictObject({
      entityColumn: columnNameSchema,
      rankingMetric: columnNameSchema,
      direction: z.enum(["asc", "desc"]),
      selectedStatistics: z
        .array(
          z.enum(
            Object.keys(statisticLabels) as [StatisticKey, ...StatisticKey[]],
          ),
        )
        .max(10),
    }),
  })
  .superRefine((value, ctx) => {
    const headers = new Set(value.dataset.headers);
    if (
      headers.size !== value.dataset.headers.length ||
      !headers.has(value.confirmation.entityColumn) ||
      !headers.has(value.confirmation.rankingMetric) ||
      value.dataset.rows.some((row) =>
        Object.keys(row).some((key) => !headers.has(key)),
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Dataset columns and confirmed columns must match.",
      });
    }
  });

const editorialText = z
  .string()
  .trim()
  .min(1)
  .max(2_000)
  .refine((value) => !/<[a-z][\s\S]*>/i.test(value), "HTML is not allowed.");
export const editorialResponseSchema = z.strictObject({
  seoTitle: z.string().trim().min(10).max(70),
  metaDescription: z.string().trim().min(50).max(170),
  eyebrow: z.string().trim().min(2).max(50),
  title: z.string().trim().min(10).max(140),
  intro: editorialText.max(1_000),
  takeaways: z.array(editorialText.max(400)).min(3).max(5),
  sections: z
    .array(
      z.strictObject({
        heading: z.string().trim().min(3).max(100),
        paragraphs: z.array(editorialText).min(1).max(3),
      }),
    )
    .min(2)
    .max(4),
  rankingTitle: z.string().trim().min(3).max(100),
  rankingDescription: editorialText.max(500),
  methodology: editorialText.max(800),
  conclusion: editorialText.max(1_000),
});

export type FinalGenerationRequest = z.infer<
  typeof finalGenerationRequestSchema
>;
export type EditorialResponse = z.infer<typeof editorialResponseSchema>;

function statisticValue(
  statistics: MetricStatistics,
  key: StatisticKey,
): number | { minimum: number; maximum: number } | undefined {
  if (key === "validCount") return statistics.validCount;
  const value = statistics[key as keyof MetricStatistics];
  return typeof value === "number" ||
    (value && typeof value === "object" && "minimum" in value)
    ? (value as number | { minimum: number; maximum: number })
    : undefined;
}

function decimals(value: number) {
  return Number.isInteger(value) ? 0 : 2;
}
function currencySymbol(example: string) {
  return example.trim().match(/^[£$€¥]/)?.[0] ?? "";
}

function formatScalar(value: number, candidate: MetricCandidate) {
  const formatted = value.toLocaleString("en-GB", {
    maximumFractionDigits: decimals(value),
  });
  if (candidate.unit === "percentage") return `${formatted}%`;
  if (candidate.unit === "currency")
    return `${currencySymbol(candidate.example)}${formatted}`;
  return formatted;
}

function formatStatistic(
  value: number | { minimum: number; maximum: number },
  candidate: MetricCandidate,
  key: StatisticKey,
) {
  if (typeof value === "number") {
    if (key === "topTenShare")
      return `${(value * 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
    return formatScalar(value, candidate);
  }
  return `${formatScalar(value.minimum, candidate)}–${formatScalar(value.maximum, candidate)}`;
}

function statDescription(key: StatisticKey, metric: string) {
  const descriptions: Record<StatisticKey, string> = {
    validCount: `Records with a usable ${metric} value.`,
    total: `Combined ${metric} across valid records.`,
    average: `Average ${metric} across valid records.`,
    minimum: `Lowest valid ${metric} value.`,
    maximum: `Highest valid ${metric} value.`,
    boundedMinimum: `Lowest reported lower bound for ${metric}.`,
    boundedMaximum: `Highest reported upper bound for ${metric}.`,
    boundedTotal: `Minimum and maximum possible combined ${metric}.`,
    boundedAverage: `Minimum and maximum possible average ${metric}.`,
    topTenShare:
      "Share of the total represented by the ten highest valid values.",
  };
  return descriptions[key];
}

function payloadMetric(
  candidate: MetricCandidate,
  statistics: MetricStatistics,
) {
  return {
    column: candidate.column,
    kind: candidate.kind,
    unit: candidate.unit,
    validCount: candidate.validCount,
    missingCount: candidate.missingCount,
    invalidCount: candidate.invalidCount,
    completeness: candidate.completeness,
    rangeCount: candidate.rangeCount,
    inconsistentUnitCount: candidate.inconsistentUnitCount,
    example: candidate.example,
    potentialTotalAllowed: candidate.canSum,
    potentialTopTenShareAllowed: candidate.canCalculateTopShare,
    potentialStatistics: statistics,
  };
}

export function prepareFinalGeneration(request: FinalGenerationRequest) {
  const { dataset, confirmation } = request;
  const candidates = findMetricCandidates(dataset.headers, dataset.rows);
  const candidate = candidates.find(
    (item) => item.column === confirmation.rankingMetric,
  );
  if (!candidate)
    throw new Error(
      "The confirmed ranking metric is not a valid numerical candidate.",
    );

  const statistics = calculateMetricStatistics(
    dataset.rows,
    candidate,
    confirmation.entityColumn,
  );
  const allowedStatistics = availableStatisticKeys(
    payloadMetric(candidate, statistics),
  );
  if (
    new Set(confirmation.selectedStatistics).size !==
      confirmation.selectedStatistics.length ||
    confirmation.selectedStatistics.some(
      (key) => !allowedStatistics.includes(key),
    )
  ) {
    throw new Error(
      "One or more selected statistics are unavailable for the confirmed metric.",
    );
  }

  const verifiedStats: BlogStat[] = confirmation.selectedStatistics.map(
    (key) => {
      const value = statisticValue(statistics, key);
      if (value === undefined)
        throw new Error(`The selected statistic ${key} has no verified value.`);
      return {
        key,
        label: statisticLabels[key],
        value: formatStatistic(value, candidate, key),
        description: statDescription(key, candidate.column),
      };
    },
  );

  const rankingMetrics: RankingMetric[] = candidates.map((metric) => ({
    key: metric.column,
    label: metric.column,
    defaultDirection:
      metric.column === confirmation.rankingMetric
        ? confirmation.direction
        : "desc",
    unit: metric.unit,
    hasRanges: metric.rangeCount > 0,
    estimatedRanking: metric.rangeCount > 0,
  }));

  const rankingRows: RankingRow[] = dataset.rows.map((row, index) => ({
    id: `row-${index + 1}`,
    entity:
      row[confirmation.entityColumn]?.trim() || `Unnamed record ${index + 1}`,
    values: Object.fromEntries(
      candidates.map((metric) => {
        const parsed = parseNumericValue(row[metric.column] ?? "");
        const valid = parsed?.unit === metric.unit ? parsed : null;
        return [
          metric.column,
          valid
            ? {
                formatted: valid.isRange
                  ? `${formatScalar(valid.lowerBound, metric)}–${formatScalar(valid.upperBound, metric)}`
                  : formatScalar(valid.value, metric),
                sortValue: valid.value,
                lowerBound: valid.lowerBound,
                upperBound: valid.upperBound,
                isRange: valid.isRange,
              }
            : { formatted: "N/A", sortValue: null },
        ];
      }),
    ),
  }));

  const sampleRows = dataset.rows
    .slice(0, 5)
    .map((row) =>
      Object.fromEntries(
        dataset.headers.map((header) => [
          header,
          (row[header] ?? "").slice(0, 500),
        ]),
      ),
    );
  const verifiedValues = Object.fromEntries(
    verifiedStats.map((stat) => [
      stat.key,
      { label: stat.label, formattedValue: stat.value },
    ]),
  );
  const context = {
    confirmedChoices: confirmation,
    dataset: {
      headers: dataset.headers,
      rowCount: dataset.rows.length,
      representativeRows: sampleRows,
    },
    verifiedValues,
    selectedMetricQuality: {
      unit: candidate.unit,
      validCount: candidate.validCount,
      missingCount: candidate.missingCount,
      invalidCount: candidate.invalidCount,
      inconsistentUnitCount: candidate.inconsistentUnitCount,
      completeness: Number(candidate.completeness.toFixed(4)),
      hasRanges: statistics.hasRanges,
      rangeCount: candidate.rangeCount,
      estimatedRanking: statistics.estimatedRanking,
      topRankedIsDefinitive: statistics.topRankedIsDefinitive,
    },
    availableMetricContext: rankingMetrics.map((metric) => ({
      column: metric.key,
      unit: metric.unit,
      hasRanges: metric.hasRanges,
      estimatedRanking: metric.estimatedRanking,
    })),
  };
  return {
    candidate,
    statistics,
    verifiedStats,
    rankingMetrics,
    rankingRows,
    context,
  };
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "company-data-story"
  );
}

function accentFor(value: string): ArticleAccent {
  const accents: ArticleAccent[] = ["coral", "sage", "sand", "ink"];
  const hash = [...value].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return accents[hash % accents.length]!;
}

function readingMinutes(editorial: EditorialResponse) {
  const words = [
    editorial.intro,
    ...editorial.takeaways,
    ...editorial.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    editorial.rankingDescription,
    editorial.methodology,
    editorial.conclusion,
  ]
    .join(" ")
    .trim()
    .split(/\s+/).length;
  return Math.max(3, Math.ceil(words / 220));
}

export function assembleBlogArticle(
  request: FinalGenerationRequest,
  editorial: EditorialResponse,
  prepared: ReturnType<typeof prepareFinalGeneration>,
  now = new Date(),
): BlogArticle {
  const slug = `${slugify(editorial.title)}-${now.getTime().toString(36)}`;
  return {
    slug,
    seoTitle: editorial.seoTitle,
    metaDescription: editorial.metaDescription,
    eyebrow: editorial.eyebrow,
    title: editorial.title,
    excerpt: editorial.intro.slice(0, 180),
    intro: editorial.intro,
    publishedAt: now.toISOString(),
    readingMinutes: readingMinutes(editorial),
    accent: accentFor(slug),
    takeaways: editorial.takeaways,
    stats: prepared.verifiedStats,
    sections: editorial.sections,
    ranking: {
      title: editorial.rankingTitle,
      description: editorial.rankingDescription,
      entityLabel: request.confirmation.entityColumn,
      metrics: prepared.rankingMetrics,
      rows: prepared.rankingRows,
    },
    defaultRankingMetric: request.confirmation.rankingMetric,
    defaultRankingDirection: request.confirmation.direction,
    methodology: editorial.methodology,
    source: {
      fileName: request.dataset.fileName,
      rowCount: request.dataset.rows.length,
      columnCount: request.dataset.headers.length,
    },
    conclusion: editorial.conclusion,
  };
}

export function validateEditorialNumbers(
  editorial: EditorialResponse,
  context: ReturnType<typeof prepareFinalGeneration>['context']
) {
  const allowed = new Set<string>()

  const allowFrom = (value: unknown) => {
    for (const match of JSON.stringify(value).matchAll(/\b\d[\d,]*(?:\.\d+)?%?\b/g)) {
      allowed.add(match[0].replaceAll(',', ''))
    }
  }

  allowFrom(context.verifiedValues)

  allowFrom({
    rowCount: context.dataset.rowCount,
    validCount: context.selectedMetricQuality.validCount,
    missingCount: context.selectedMetricQuality.missingCount,
    invalidCount: context.selectedMetricQuality.invalidCount,
    rangeCount: context.selectedMetricQuality.rangeCount
  })

  const unsupported = [
    ...JSON.stringify(editorial).matchAll(/\b\d[\d,]*(?:\.\d+)?%?\b/g)
  ]
    .map(match => match[0].replaceAll(',', ''))
    .filter(value => !allowed.has(value))

  return [...new Set(unsupported)]
}
