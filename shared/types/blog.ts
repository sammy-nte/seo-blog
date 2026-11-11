export type NumericUnit = "plain" | "currency" | "percentage";
export type RankingDirection = "asc" | "desc";
export type ArticleAccent = "coral" | "sage" | "sand" | "ink";

export interface BlogStat {
  key: string;
  label: string;
  value: string;
  description?: string;
}
export interface BlogSection {
  heading: string;
  paragraphs: string[];
}
export interface RankingValue {
  formatted: string;
  sortValue: number | null;
  lowerBound?: number;
  upperBound?: number;
  isRange?: boolean;
}
export interface RankingRow {
  id: string;
  entity: string;
  detail?: string;
  values: Record<string, RankingValue>;
}
export interface RankingMetric {
  key: string;
  label: string;
  defaultDirection: RankingDirection;
  unit: NumericUnit;
  hasRanges: boolean;
  estimatedRanking: boolean;
}
export interface BlogRanking {
  title: string;
  description: string;
  entityLabel: string;
  detailLabel?: string;
  metrics: RankingMetric[];
  rows: RankingRow[];
}
export interface BlogSource {
  fileName: string;
  rowCount: number;
  columnCount: number;
}

export interface BlogArticle {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  intro: string;
  publishedAt: string;
  readingMinutes: number;
  accent: ArticleAccent;
  takeaways: string[];
  stats: BlogStat[];
  sections: BlogSection[];
  ranking: BlogRanking;
  defaultRankingMetric: string;
  defaultRankingDirection: RankingDirection;
  methodology: string;
  source: BlogSource;
  conclusion: string;
}

export type BlogArticleSummary = Pick<BlogArticle,
  | "slug"
  | "seoTitle"
  | "metaDescription"
  | "eyebrow"
  | "title"
  | "excerpt"
  | "publishedAt"
  | "readingMinutes"
  | "accent"
>;
