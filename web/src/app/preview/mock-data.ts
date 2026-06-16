import type { PortfolioData, GithubProfile } from "@/types/portfolio"

function mockGithubProfile(seed: string, followers: number, following: number, totalContributions: number): GithubProfile {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const rand = () => {
    h = Math.imul(2654435761, h) ^ (h >>> 16)
    return (h >>> 0) / 0xffffffff
  }

  const now = new Date()
  const contribution_weeks = Array.from({ length: 53 }, (_, wi) => {
    const weekStart = new Date(now.getTime() - (52 - wi) * 7 * 86400000)
    const days = Array.from({ length: 7 }, (__, di) => {
      const date = new Date(weekStart.getTime() + di * 86400000)
      const isWeekend = di === 0 || di === 6
      const r = rand()
      const prob = isWeekend ? 0.2 : 0.45
      const count = r < prob ? Math.floor(rand() * 8) + 1 : 0
      const level = (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4) as 0 | 1 | 2 | 3 | 4
      return { date: date.toISOString().slice(0, 10), count, level }
    })
    return { days }
  })

  return { followers, following, total_contributions: totalContributions, contribution_weeks }
}

// ── Systems Engineer ──────────────────────────────────────────────────────────
// Used by: Terminal template
export const MOCK_DATA: PortfolioData = {
  username: "alexchen",
  avatar_url: "https://avatars.githubusercontent.com/u/583231",
  mdx_content: `Systems programmer working across Rust, Go, and TypeScript — with a consistent focus on language tooling, WebAssembly runtimes, and distributed infrastructure. Projects range from production LSP implementations to embeddable query planners.

## About

Builds primarily in Rust and Go, with a strong leaning toward systems-level problems: language servers, sandboxed execution environments, and distributed key-value stores. TypeScript projects tend toward developer tooling — hot patching systems and query planners — rather than user-facing applications. Complexity scores and exported API surfaces across repositories suggest a preference for well-defined interfaces over large, monolithic codebases.

## Open Source Contributions

Actively contributes to external projects in the Rust and WebAssembly ecosystems, focusing on correctness fixes and runtime performance improvements.

- [bytecodealliance/wasmtime](https://github.com/bytecodealliance/wasmtime) — [Fix WASI socket fd leak on early exit](https://github.com/bytecodealliance/wasmtime/pull/7421) (merged 2024-04-12)
- [tokio-rs/tokio](https://github.com/tokio-rs/tokio) — [Add cancellation safety note to select! docs](https://github.com/tokio-rs/tokio/pull/6103) (merged 2024-01-08)
`,
  theme_config: { template: "terminal" },
  last_synced_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  github_profile: {
    ...mockGithubProfile("alexchen", 1847, 312, 1203),
    language_bytes: { Rust: 128400, TypeScript: 94200, Go: 61800, Python: 12300, Shell: 4100 },
  },
  repositories: [
    {
      id: "repo-1",
      portfolio_id: "portfolio-1",
      github_repo_id: "123456",
      name: "flux-lsp",
      full_name: "alexchen/flux-lsp",
      description: "A language server implementation for Flux query language with full LSP support",
      html_url: "https://github.com/alexchen/flux-lsp",
      homepage: null,
      primary_language: "Rust",
      topics: ["lsp", "language-server", "flux", "rust"],
      stars_count: 847,
      forks_count: 62,
      ai_summary: "A production-grade Language Server Protocol implementation for the Flux query language. Features real-time diagnostics, auto-completion with context-aware suggestions, go-to-definition across module boundaries, and semantic token highlighting. Built with tower-lsp and tested against the official LSP conformance suite.",
      ast_metadata: {
        language: "Rust",
        exported_symbols: ["LspServer", "DiagnosticProvider", "CompletionEngine"],
        imports: ["tower-lsp", "tokio", "serde_json"],
        function_count: 124,
        class_count: 18,
        frameworks: ["tower-lsp", "tokio"],
        complexity_score: 82,
      },
      created_at: "2022-03-15T10:00:00Z",
      updated_at: "2024-08-01T14:23:00Z",
    },
    {
      id: "repo-2",
      portfolio_id: "portfolio-1",
      github_repo_id: "234567",
      name: "wasm-sandbox",
      full_name: "alexchen/wasm-sandbox",
      description: "Secure WebAssembly execution sandbox with memory isolation and capability-based security",
      html_url: "https://github.com/alexchen/wasm-sandbox",
      homepage: "https://wasm-sandbox.dev",
      primary_language: "Rust",
      topics: ["webassembly", "wasm", "security", "sandbox"],
      stars_count: 412,
      forks_count: 31,
      ai_summary: "A capability-based WebAssembly sandbox that enforces strict memory isolation between guest modules. Implements a custom WASI shim with fine-grained syscall filtering, resource limits, and audit logging. Used in production to safely execute user-submitted code at scale.",
      ast_metadata: {
        language: "Rust",
        exported_symbols: ["Sandbox", "Capability", "WasiShim"],
        imports: ["wasmtime", "cap-std", "seccomp"],
        function_count: 89,
        class_count: 12,
        frameworks: ["wasmtime"],
        complexity_score: 74,
      },
      created_at: "2023-01-20T08:00:00Z",
      updated_at: "2024-07-15T11:00:00Z",
    },
    {
      id: "repo-3",
      portfolio_id: "portfolio-1",
      github_repo_id: "345678",
      name: "edgekv",
      full_name: "alexchen/edgekv",
      description: "Distributed key-value store optimized for edge nodes with eventual consistency",
      html_url: "https://github.com/alexchen/edgekv",
      homepage: null,
      primary_language: "Go",
      topics: ["distributed-systems", "kv-store", "edge", "golang"],
      stars_count: 253,
      forks_count: 19,
      ai_summary: "A lightweight distributed key-value store designed for edge deployments where network partitions are expected. Uses a CRDT-based conflict resolution strategy to guarantee eventual consistency without coordination. Handles ~200k ops/sec on commodity hardware with sub-millisecond P99 latency.",
      ast_metadata: {
        language: "Go",
        exported_symbols: ["Store", "Node", "Replicator"],
        imports: ["hashicorp/raft", "bbolt", "grpc"],
        function_count: 67,
        class_count: 9,
        frameworks: ["gRPC"],
        complexity_score: 68,
      },
      created_at: "2023-06-10T09:00:00Z",
      updated_at: "2024-06-20T16:00:00Z",
    },
    {
      id: "repo-4",
      portfolio_id: "portfolio-1",
      github_repo_id: "456789",
      name: "hotpatch",
      full_name: "alexchen/hotpatch",
      description: "Live code patching for Node.js services without restarts",
      html_url: "https://github.com/alexchen/hotpatch",
      homepage: null,
      primary_language: "TypeScript",
      topics: ["nodejs", "hot-reload", "devtools", "typescript"],
      stars_count: 1204,
      forks_count: 88,
      ai_summary: "A zero-downtime hot patching system for Node.js. Intercepts module resolution to swap implementations at runtime while preserving in-flight request state. Used in development to achieve sub-second feedback loops without process restarts. Supports ESM and CJS, with optional TypeScript compilation in the hot path.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["HotPatcher", "ModuleRegistry", "PatchDescriptor"],
        imports: ["esbuild", "chokidar", "worker_threads"],
        function_count: 45,
        class_count: 6,
        frameworks: ["Node.js"],
        complexity_score: 59,
      },
      created_at: "2021-11-05T12:00:00Z",
      updated_at: "2024-05-10T09:00:00Z",
    },
    {
      id: "repo-5",
      portfolio_id: "portfolio-1",
      github_repo_id: "567890",
      name: "pqlite",
      full_name: "alexchen/pqlite",
      description: "Embeddable SQL query planner written in pure TypeScript",
      html_url: "https://github.com/alexchen/pqlite",
      homepage: null,
      primary_language: "TypeScript",
      topics: ["sql", "query-planner", "database", "typescript"],
      stars_count: 178,
      forks_count: 14,
      ai_summary: "A hand-written recursive-descent SQL parser and query planner that compiles SELECT statements to optimized execution plans. Supports joins, subqueries, window functions, and CTEs. Originally built to power inline SQL evaluation in a code editor extension.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["Parser", "Planner", "Executor"],
        imports: [],
        function_count: 112,
        class_count: 22,
        frameworks: [],
        complexity_score: 88,
      },
      created_at: "2022-09-01T15:00:00Z",
      updated_at: "2024-03-01T10:00:00Z",
    },
  ],
}

// ── Full-Stack Engineer ───────────────────────────────────────────────────────
// Used by: Minimal template
export const FULLSTACK_MOCK_DATA: PortfolioData = {
  username: "priyapatel",
  avatar_url: "https://avatars.githubusercontent.com/u/17110",
  mdx_content: `Full-stack engineer with five years building product at early-stage startups — from zero-to-one infrastructure through scale. Comfortable owning a feature end-to-end: database schema, API, and the React component that ships to users.

## About

Most work lives at the intersection of product and infrastructure: building the data pipelines that power dashboards, the auth systems that protect user data, and the real-time features users actually notice. Prefers Next.js App Router for its colocation of server and client code, and PostgreSQL for its reliability and extension ecosystem (pgvector, pg_cron).

## Open Source Contributions

- [vercel/next.js](https://github.com/vercel/next.js) — [Fix stale cache on parallel route revalidation](https://github.com/vercel/next.js/pull/61204) (merged 2024-03-15)
- [drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) — [Add support for pg_cron job scheduling](https://github.com/drizzle-team/drizzle-orm/pull/1843) (merged 2024-01-22)
`,
  theme_config: { template: "minimal" },
  last_synced_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  github_profile: {
    ...mockGithubProfile("priyapatel", 934, 204, 876),
    language_bytes: { TypeScript: 218400, JavaScript: 41200, CSS: 18900, SQL: 7600, Shell: 3200 },
  },
  repositories: [
    {
      id: "fs-repo-1",
      portfolio_id: "portfolio-fs",
      github_repo_id: "700001",
      name: "forma",
      full_name: "priyapatel/forma",
      description: "Type-safe form builder with validation, multi-step flows, and conditional logic",
      html_url: "https://github.com/priyapatel/forma",
      homepage: "https://forma.dev",
      primary_language: "TypeScript",
      topics: ["forms", "react", "validation", "typescript"],
      stars_count: 2341,
      forks_count: 187,
      ai_summary: "A headless form engine for React that treats forms as state machines. Supports multi-step wizards with branching logic, field-level async validation, and schema-driven rendering. Zero runtime dependencies beyond React. Used in production for onboarding flows handling 50k+ submissions per day.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["useForm", "FormField", "FormStep", "createSchema"],
        imports: ["react", "zod"],
        function_count: 83,
        class_count: 4,
        frameworks: ["React"],
        complexity_score: 71,
      },
      created_at: "2022-07-10T10:00:00Z",
      updated_at: "2024-09-01T09:00:00Z",
    },
    {
      id: "fs-repo-2",
      portfolio_id: "portfolio-fs",
      github_repo_id: "700002",
      name: "stackboard",
      full_name: "priyapatel/stackboard",
      description: "Real-time engineering metrics dashboard built on Next.js App Router and Supabase",
      html_url: "https://github.com/priyapatel/stackboard",
      homepage: "https://stackboard.app",
      primary_language: "TypeScript",
      topics: ["nextjs", "dashboard", "supabase", "real-time"],
      stars_count: 1089,
      forks_count: 94,
      ai_summary: "An engineering metrics platform that aggregates GitHub, Linear, and deployment data into a single real-time dashboard. Uses Next.js Server Actions for mutations, Supabase Realtime for live updates, and server components for initial data hydration. Deployed on Vercel with edge middleware for per-team routing.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["Dashboard", "MetricCard", "useRealtime", "fetchTeamMetrics"],
        imports: ["next", "@supabase/ssr", "recharts", "drizzle-orm"],
        function_count: 156,
        class_count: 0,
        frameworks: ["Next.js", "Supabase"],
        complexity_score: 63,
      },
      created_at: "2023-02-14T08:00:00Z",
      updated_at: "2024-08-20T14:00:00Z",
    },
    {
      id: "fs-repo-3",
      portfolio_id: "portfolio-fs",
      github_repo_id: "700003",
      name: "relay-auth",
      full_name: "priyapatel/relay-auth",
      description: "Drop-in auth middleware for Next.js with RBAC, magic links, and OAuth",
      html_url: "https://github.com/priyapatel/relay-auth",
      homepage: null,
      primary_language: "TypeScript",
      topics: ["auth", "nextjs", "rbac", "oauth"],
      stars_count: 672,
      forks_count: 51,
      ai_summary: "A composable authentication layer for Next.js App Router. Provides role-based access control via middleware, magic-link email auth, and OAuth providers (GitHub, Google). Built on JWT with short-lived tokens and a rotating refresh token pattern. Ships as a single npm package with zero required configuration for common cases.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["withAuth", "getSession", "createMiddleware", "defineRoles"],
        imports: ["next", "jose", "nodemailer", "zod"],
        function_count: 74,
        class_count: 2,
        frameworks: ["Next.js"],
        complexity_score: 66,
      },
      created_at: "2023-09-05T11:00:00Z",
      updated_at: "2024-07-10T16:00:00Z",
    },
    {
      id: "fs-repo-4",
      portfolio_id: "portfolio-fs",
      github_repo_id: "700004",
      name: "pgvault",
      full_name: "priyapatel/pgvault",
      description: "PostgreSQL migration toolkit with safe rollbacks and schema diffing",
      html_url: "https://github.com/priyapatel/pgvault",
      homepage: null,
      primary_language: "TypeScript",
      topics: ["postgresql", "migrations", "database", "devops"],
      stars_count: 438,
      forks_count: 36,
      ai_summary: "A CLI tool and library for managing PostgreSQL schema migrations with safety guarantees. Generates SQL diffs between schema states, detects destructive changes, and supports dry-run previews before applying to production. Integrates with CI/CD pipelines to gate deployments on migration review.",
      ast_metadata: {
        language: "TypeScript",
        exported_symbols: ["migrate", "diff", "rollback", "validate"],
        imports: ["pg", "chalk", "commander"],
        function_count: 58,
        class_count: 3,
        frameworks: ["Node.js"],
        complexity_score: 54,
      },
      created_at: "2023-11-20T13:00:00Z",
      updated_at: "2024-06-05T10:00:00Z",
    },
  ],
}

// ── ML Engineer ───────────────────────────────────────────────────────────────
// Used by: Void template
export const ML_MOCK_DATA: PortfolioData = {
  username: "daniyarb",
  avatar_url: "https://avatars.githubusercontent.com/u/1024025",
  mdx_content: `ML engineer focused on the gap between research and production: turning promising model architectures into reliable, observable inference systems that actually ship. Work spans fine-tuning pipelines, custom training infrastructure, and the evaluation frameworks that tell you whether a model is actually better.

## About

Background in applied mathematics with a drift toward systems. Comfortable writing CUDA kernels when a bottleneck demands it, but most time goes into training infrastructure, dataset curation, and the evaluation pipelines that honest model comparison requires. Current focus is on efficient inference — quantization, speculative decoding, and KV cache management at scale.

## Open Source Contributions

- [huggingface/transformers](https://github.com/huggingface/transformers) — [Add Flash Attention 2 support for Mistral fine-tuning](https://github.com/huggingface/transformers/pull/27043) (merged 2024-02-18)
- [pytorch/pytorch](https://github.com/pytorch/pytorch) — [Fix memory leak in gradient accumulation with AMP](https://github.com/pytorch/pytorch/pull/116204) (merged 2024-01-30)
`,
  theme_config: { template: "void" },
  last_synced_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  github_profile: {
    ...mockGithubProfile("daniyarb", 2641, 187, 1548),
    language_bytes: { Python: 312800, CUDA: 48200, "C++": 31400, Shell: 12600, Dockerfile: 4100 },
  },
  repositories: [
    {
      id: "ml-repo-1",
      portfolio_id: "portfolio-ml",
      github_repo_id: "800001",
      name: "liteval",
      full_name: "daniyarb/liteval",
      description: "Lightweight LLM evaluation framework with reproducible benchmarks and side-by-side comparisons",
      html_url: "https://github.com/daniyarb/liteval",
      homepage: "https://liteval.dev",
      primary_language: "Python",
      topics: ["llm", "evaluation", "benchmarks", "pytorch"],
      stars_count: 3102,
      forks_count: 241,
      ai_summary: "An evaluation framework for language models that prioritises reproducibility and honest comparison. Implements MMLU, HellaSwag, and custom task suites with deterministic sampling and seed-locked evaluation. Supports vLLM, HuggingFace, and OpenAI-compatible APIs through a unified interface. Results are stored as structured artifacts for longitudinal tracking.",
      ast_metadata: {
        language: "Python",
        exported_symbols: ["Evaluator", "BenchmarkSuite", "ModelAdapter", "EvalResult"],
        imports: ["torch", "transformers", "vllm", "numpy", "pandas"],
        function_count: 98,
        class_count: 14,
        frameworks: ["PyTorch", "HuggingFace"],
        complexity_score: 69,
      },
      created_at: "2023-03-10T10:00:00Z",
      updated_at: "2024-08-15T11:00:00Z",
    },
    {
      id: "ml-repo-2",
      portfolio_id: "portfolio-ml",
      github_repo_id: "800002",
      name: "specpipe",
      full_name: "daniyarb/specpipe",
      description: "Speculative decoding pipeline for 3–5× inference throughput on consumer GPUs",
      html_url: "https://github.com/daniyarb/specpipe",
      homepage: null,
      primary_language: "Python",
      topics: ["speculative-decoding", "inference", "cuda", "pytorch"],
      stars_count: 1847,
      forks_count: 143,
      ai_summary: "An implementation of speculative decoding that pairs a small draft model with a large verifier to achieve 3–5× throughput improvements on text generation tasks. Includes a custom CUDA kernel for batched token acceptance and a profiling harness for measuring acceptance rates across prompt distributions. Tested on Llama 3 with Llama 3 1B as the draft model.",
      ast_metadata: {
        language: "Python",
        exported_symbols: ["SpeculativeDecoder", "DraftModel", "VerifierModel", "TokenAcceptor"],
        imports: ["torch", "triton", "transformers", "accelerate"],
        function_count: 67,
        class_count: 8,
        frameworks: ["PyTorch", "Triton"],
        complexity_score: 78,
      },
      created_at: "2023-08-22T09:00:00Z",
      updated_at: "2024-07-30T14:00:00Z",
    },
    {
      id: "ml-repo-3",
      portfolio_id: "portfolio-ml",
      github_repo_id: "800003",
      name: "qlora-kit",
      full_name: "daniyarb/qlora-kit",
      description: "QLoRA fine-tuning toolkit for instruction-following models with PEFT and bitsandbytes",
      html_url: "https://github.com/daniyarb/qlora-kit",
      homepage: null,
      primary_language: "Python",
      topics: ["qlora", "fine-tuning", "peft", "llm"],
      stars_count: 924,
      forks_count: 87,
      ai_summary: "A practical fine-tuning toolkit built around QLoRA — 4-bit quantization with low-rank adapter training. Handles dataset preprocessing, gradient checkpointing, multi-GPU training via FSDP, and checkpoint merging back to full precision. Includes recipes for Mistral, Llama, and Phi model families. Reduces fine-tuning a 7B model to under 12 GB VRAM.",
      ast_metadata: {
        language: "Python",
        exported_symbols: ["FineTuner", "LoRAConfig", "DatasetBuilder", "CheckpointMerger"],
        imports: ["transformers", "peft", "bitsandbytes", "datasets", "trl"],
        function_count: 54,
        class_count: 7,
        frameworks: ["HuggingFace", "PEFT"],
        complexity_score: 61,
      },
      created_at: "2023-11-05T12:00:00Z",
      updated_at: "2024-05-20T10:00:00Z",
    },
    {
      id: "ml-repo-4",
      portfolio_id: "portfolio-ml",
      github_repo_id: "800004",
      name: "dataforge",
      full_name: "daniyarb/dataforge",
      description: "Dataset construction and deduplication pipeline for LLM pre-training",
      html_url: "https://github.com/daniyarb/dataforge",
      homepage: null,
      primary_language: "Python",
      topics: ["dataset", "deduplication", "preprocessing", "nlp"],
      stars_count: 567,
      forks_count: 44,
      ai_summary: "A data pipeline for constructing clean pre-training corpora. Implements MinHash LSH deduplication at document and paragraph level, quality filtering via perplexity scoring, and PII detection using NER models. Processes 1 TB of raw text in under 4 hours on a 32-core machine. Used to build the training set for two published model families.",
      ast_metadata: {
        language: "Python",
        exported_symbols: ["Pipeline", "MinHashDeduplicator", "QualityFilter", "PIIRedactor"],
        imports: ["datasketch", "spacy", "ray", "pyarrow", "datasets"],
        function_count: 79,
        class_count: 11,
        frameworks: ["Ray", "HuggingFace"],
        complexity_score: 73,
      },
      created_at: "2022-12-01T14:00:00Z",
      updated_at: "2024-04-10T09:00:00Z",
    },
  ],
}
