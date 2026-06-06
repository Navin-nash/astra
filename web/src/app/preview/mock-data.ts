import type { PortfolioData } from "@/types/portfolio"

export const MOCK_DATA: PortfolioData = {
  username: "alexchen",
  avatar_url: "https://avatars.githubusercontent.com/u/583231",
  mdx_content: `# Alex Chen

Full-stack engineer obsessed with developer tooling, compilers, and systems that scale without ceremony. I build things that help other engineers ship faster.

Currently focused on Rust-based infrastructure, WebAssembly runtimes, and language server protocols.

## About

Five years building production systems across fintech, devtools, and open-source. I care deeply about API design, performance observability, and the kind of code that reads like prose.

Previously at Stripe and Vercel. Now independent, building in the open.

## Experience

- **Staff Engineer** — Stripe (2021–2024)
- **Senior Engineer** — Vercel (2019–2021)
- **Software Engineer** — Early-stage startup (2017–2019)
`,
  theme_config: {
    template: "void",
  },
  last_synced_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
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
