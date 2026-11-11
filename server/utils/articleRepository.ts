import type { BlogArticle, BlogArticleSummary } from '#shared/types/blog'
import { finalGenerationRequestSchema, prepareFinalGeneration } from '#shared/utils/articleGeneration'
import { getSupabaseServerClient } from './supabase'

export async function persistPublishedArticle(article: BlogArticle, request: unknown) {
  const parsed = finalGenerationRequestSchema.parse(request)
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.rpc('publish_article', {
    p_dataset: {
      source_filename: parsed.dataset.fileName,
      row_count: parsed.dataset.rows.length,
      column_names: parsed.dataset.headers,
      records: parsed.dataset.rows
    },
    p_article: {
      slug: article.slug,
      seo_title: article.seoTitle,
      meta_description: article.metaDescription,
      eyebrow: article.eyebrow,
      title: article.title,
      intro: article.intro,
      conclusion: article.conclusion,
      entity_column: parsed.confirmation.entityColumn,
      ranking_metric: parsed.confirmation.rankingMetric,
      ranking_direction: parsed.confirmation.direction,
      selected_statistics: parsed.confirmation.selectedStatistics,
      statistics: article.stats,
      takeaways: article.takeaways,
      ranking_title: article.ranking.title,
      ranking_description: article.ranking.description,
      accent: article.accent,
      methodology: article.methodology,
      published_at: article.publishedAt,
      reading_minutes: article.readingMinutes
    },
    p_sections: article.sections
  })
  if (error || !data) {
    throw createError({ statusCode: 502, statusMessage: 'The article could not be published. Please try again.' })
  }
  return data as { article_id: string; dataset_id: string; slug: string }
}

export async function loadPublishedArticleSummaries(): Promise<BlogArticleSummary[]> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('articles')
    .select('slug, seo_title, meta_description, eyebrow, title, intro, published_at, reading_minutes, accent')
    .order('published_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 502, statusMessage: 'Articles are temporarily unavailable. Please try again later.' })
  }

  return (data ?? []).map(article => ({
    slug: String(article.slug),
    seoTitle: String(article.seo_title),
    metaDescription: String(article.meta_description),
    eyebrow: String(article.eyebrow),
    title: String(article.title),
    excerpt: String(article.intro).slice(0, 180),
    publishedAt: String(article.published_at),
    readingMinutes: Number(article.reading_minutes),
    accent: article.accent as BlogArticleSummary['accent']
  }))
}

export async function loadPublishedArticle(slug: string): Promise<BlogArticle | null> {
  const supabase = getSupabaseServerClient()
  const { data: article, error } = await supabase
    .from('articles')
    .select('*, article_sections(position, heading, paragraphs)')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw createError({ statusCode: 502, statusMessage: 'This article is temporarily unavailable. Please try again later.' })
  if (!article) return null

  const { data: dataset, error: datasetError } = await supabase.from('datasets').select('*').eq('id', article.dataset_id).single()
  if (datasetError || !dataset) throw createError({ statusCode: 502, statusMessage: 'This article is temporarily unavailable. Please try again later.' })

  const request = finalGenerationRequestSchema.parse({
    dataset: { fileName: dataset.source_filename, headers: dataset.column_names, rows: dataset.records },
    confirmation: {
      entityColumn: article.entity_column,
      rankingMetric: article.ranking_metric,
      direction: article.ranking_direction,
      selectedStatistics: article.selected_statistics
    }
  })
  const prepared = prepareFinalGeneration(request)
  const sections = [...(article.article_sections ?? [])].sort((a, b) => a.position - b.position)
    .map(section => ({ heading: section.heading, paragraphs: section.paragraphs }))
  const intro = String(article.intro)
  return {
    slug: article.slug,
    seoTitle: article.seo_title,
    metaDescription: article.meta_description,
    eyebrow: article.eyebrow,
    title: article.title,
    excerpt: intro.slice(0, 180),
    intro,
    publishedAt: article.published_at,
    readingMinutes: article.reading_minutes,
    accent: article.accent,
    takeaways: article.takeaways,
    stats: article.statistics,
    sections,
    ranking: {
      title: article.ranking_title,
      description: article.ranking_description,
      entityLabel: article.entity_column,
      metrics: prepared.rankingMetrics,
      rows: prepared.rankingRows
    },
    defaultRankingMetric: article.ranking_metric,
    defaultRankingDirection: article.ranking_direction,
    methodology: article.methodology,
    source: { fileName: dataset.source_filename, rowCount: dataset.row_count, columnCount: dataset.column_names.length },
    conclusion: article.conclusion
  }
}
