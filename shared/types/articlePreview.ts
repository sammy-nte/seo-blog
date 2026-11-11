import type { BlogArticle } from './blog'
import type { EditorialResponse, FinalGenerationRequest } from '../utils/articleGeneration'

export interface GeneratedArticlePreview {
  article: BlogArticle
  editorial: EditorialResponse
  request: FinalGenerationRequest
}
