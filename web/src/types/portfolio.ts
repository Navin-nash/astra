export type TemplateId = "void" | "minimal" | "terminal"

export interface AstMetadata {
  language: string
  exported_symbols: string[]
  imports: string[]
  function_count: number
  class_count: number
  frameworks: string[]
  complexity_score: number
}

export interface PortfolioRepo {
  id: string
  portfolio_id: string
  github_repo_id: string
  name: string
  full_name: string
  description: string | null
  html_url: string | null
  homepage: string | null
  primary_language: string | null
  topics: string[]
  stars_count: number
  forks_count: number
  ai_summary: string | null
  ast_metadata: AstMetadata | null
  created_at: string
  updated_at: string
}

export interface PortfolioData {
  username: string
  avatar_url: string | null
  mdx_content: string
  theme_config: {
    template: TemplateId
    accent?: string
  }
  last_synced_at: string | null
  repositories: PortfolioRepo[]
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  topics: string[]
  stargazers_count: number
  forks_count: number
  private: boolean
  fork: boolean
  archived: boolean
  updated_at: string
}
