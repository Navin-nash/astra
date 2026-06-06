Project Astra: Master Technical & Product Documentation

Domain: useastra.qzz.io

Document Version: 1.0.0

Status: Approved for MVP Development

Lead Architect: Senior Technical Lead

1. Executive Summary & Core Ideology

1.1 Core Concept

Astra is a zero-friction, AI-driven portfolio generator. It leverages Rust-based Abstract Syntax Tree (AST) parsing and Next.js dynamic MDX rendering to transform a developer's GitHub presence into a beautifully designed, instantly deployed technical portfolio.

1.2 Core Ideology: "Code as the Source of Truth"

Traditional portfolios decay because they require manual upkeep. Astra treats the codebase itself as the single source of truth. By deeply analyzing repository structures—not just reading titles and stars—Astra understands how a developer builds software, automating the translation of raw syntax into high-impact engineering narratives.

1.3 Use Cases

The Active Job Seeker: Instantly spins up a technical portfolio reflecting their latest open-source or public contributions to share with recruiters.

The Continuous Learner: Tracks their evolution across frameworks and languages via automated structural updates.

The Open Source Contributor: Highlights specific engineering patterns, custom hooks, or algorithmic contributions rather than just repository names.

2. Product Requirements Document (PRD)

2.1 Product Vision & Scope

To build a developer-first tool that completely abstracts the portfolio creation process.

MVP Scope: GitHub OAuth, public repository ingestion, AST-assisted README parsing, LLM-generated project summaries, customizable MDX layouts, and instant dynamic hosting at useastra.qzz.io/[username].

V2 Scope (Future): Private repositories (via GitHub App integration), deep dependency analysis (e.g., scoring security practices), custom domain mapping (CNAME), and premium themes.

2.2 User Stories

US-1: As a developer, I want to authenticate via GitHub so that I don't have to create a separate account or manually enter my details.

US-2: As a user, I want to see a list of my repositories and select the top 3-5 to feature.

US-3: As a user, I want the system to automatically read my code structure and README to generate a professional summary of my work.

US-4: As a user, I want to edit the AI-generated text before it goes live.

US-5: As a user, I want a public URL (useastra.qzz.io/[username]) that instantly displays my portfolio without waiting for a build step.

2.3 Success Metrics

Generation Velocity: Time from repository selection to complete portfolio generation must be < 15 seconds.

Page Load Efficiency: Public portfolios must achieve an initial Time to First Byte (TTFB) < 200ms.

Activation Rate: 70% of users who authenticate should successfully publish a portfolio.

3. Software Requirements Specification (SRS)

3.1 Functional Requirements (FR)

FR-1 [Authentication]: System must implement GitHub OAuth2.0 to securely authenticate users and issue JWTs for session management.

FR-2 [Data Ingestion]: System must asynchronously query the GitHub REST/GraphQL API to fetch user profiles, repository metadata, languages, and raw file contents (README.md, package.json, etc.).

FR-3 [AST Profiling]: The backend must parse core entry-point files using tree-sitter to infer structural depth (e.g., identifying frameworks, routing structures, and module counts).

FR-4 [AI Generation]: System must format AST output and README content into a prompt for an LLM (e.g., OpenAI/Anthropic) to generate structured MDX.

FR-5 [Dynamic Routing]: The presentation layer must capture the route parameter /[username], fetch the generated MDX from the database, and render it server-side.

3.2 Non-Functional Requirements (NFR)

NFR-1 [Concurrency]: The data ingestion engine must utilize Rust's tokio runtime to process multiple repositories and AI API calls concurrently.

NFR-2 [Resilience & Rate Limiting]: Backend must implement token-bucket algorithms and exponential backoff to handle GitHub and LLM API rate limits gracefully.

NFR-3 [Caching]: A Redis caching layer must sit between the DB and the Frontend to serve public profiles instantly. Cache TTL should be set to 24 hours or invalidated on manual sync.

NFR-4 [Security]: OAuth access tokens must be encrypted at rest in the PostgreSQL database using AES-256-GCM.

4. Technical Specifications

4.1 Technology Stack

Frontend: Next.js (App Router), React, Tailwind CSS, next-mdx-remote (for dynamic MDX), react-github-calendar.

Backend API / Engine: Rust, Axum (Web Framework), Tokio (Async), reqwest & octocrab (GitHub API clients).

AST Parser: tree-sitter (Rust bindings) with language grammars (TS, Rust, Go, Python).

AI Integration: async-openai (Rust crate).

Database: PostgreSQL (Primary Store), SQLx (Rust ORM).

Cache: Redis.

4.2 Data Models (PostgreSQL Schema)

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    oauth_token BYTEA, -- Encrypted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios Table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mdx_content TEXT NOT NULL,
    theme_config JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repositories Table (Tracked repos)
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    github_repo_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_language VARCHAR(50),
    ast_metadata JSONB, -- Structural data extracted by tree-sitter
    ai_summary TEXT
);


5. Architectural Structure & Flow Diagrams

5.1 High-Level Architecture Map

This diagram outlines the physical separation between the client presentation, the Rust heavy-lifting engine, and external services.

graph TD
    %% User Interactions
    Visitor[Public Visitor] -->|Requests /username| Next[Next.js Edge Renderer]
    DevUser[Developer] -->|Configures & Publishes| Next

    %% Frontend to Backend
    Next -->|Reads MDX / Checks Cache| Redis[(Redis Cache)]
    Next -->|API Calls (JWT auth)| RustGateway[Rust Axum Gateway]

    %% Backend Internals
    RustGateway -->|Read/Write State| Postgres[(PostgreSQL DB)]
    RustGateway -->|Dispatch Job| Worker[Rust Async Worker Pool]

    %% Worker Processes
    Worker -->|1. Fetch Code| GitHub[GitHub API]
    Worker -->|2. Parse AST| TreeSitter{Tree-sitter Engine}
    Worker -->|3. Generate Content| LLM[LLM API OpenAI/Claude]
    
    %% Worker Saves State
    Worker -->|Save Generated MDX| Postgres
    Worker -->|Invalidate Cache| Redis


5.2 Application Data Flow (Onboarding & Generation)

The sequence of events when a user decides to generate their portfolio.

sequenceDiagram
    actor Dev as Developer
    participant UI as Next.js UI
    participant API as Rust API
    participant GH as GitHub
    participant TS as Tree-sitter
    participant AI as LLM API
    participant DB as Postgres

    Dev->>UI: Click "Generate Portfolio" (OAuth)
    UI->>API: Initiate OAuth Handshake
    API->>GH: Get Access Token & Profile
    GH-->>API: Returns GitHub Profile Data
    API->>DB: Upsert User Record
    API-->>UI: Return JWT & Dashboard State
    
    Dev->>UI: Selects Repositories (e.g. Repo A, Repo B)
    UI->>API: POST /api/generate {repos}
    
    par Async Processing per Repo
        API->>GH: Fetch README, package.json, src files
        GH-->>API: Raw File Text
        API->>TS: Parse AST on Entry Files
        TS-->>API: Framework/Architecture Metadata
        API->>AI: Send Prompt (README + AST Metadata)
        AI-->>API: Returns Structured MDX Summary
    end
    
    API->>DB: Assemble & Save Final MDX String
    API-->>UI: Generation Complete (200 OK)
    
    Dev->>UI: Review & Publish
    UI->>API: PATCH /api/publish
    API->>DB: Set is_published = true


5.3 Dynamic Rendering Flow (Public Visitor)

How useastra.qzz.io/navinraj handles a request under 200ms.

flowchart LR
    A[Visitor hits /navinraj] --> B{Next.js App Router}
    B --> C{Check Redis Cache for 'navinraj'}
    C -- Hit --> D[Return Cached MDX]
    C -- Miss --> E[Query Postgres for 'navinraj']
    E --> F[Compile MDX via next-mdx-remote]
    F --> G[Save to Redis]
    G --> H[Return Rendered HTML]
    D --> H


6. Implementation Plan & Task Breakdown

Phase 1: Infrastructure & Auth (Weeks 1-2)

Ops: Setup GitHub OAuth App credentials. Provision PostgreSQL and Redis instances.

Rust: Initialize Axum server. Implement /auth/github/callback endpoint. Write JWT middleware for protected routes.

Next.js: Setup base project with Tailwind. Create landing page and login flow.

Phase 2: The Ingestion & Parsing Engine (Weeks 3-4)

Rust/GitHub: Implement octocrab to list user repos. Create async worker functions to pull down raw file contents based on language logic (e.g., if TS, look for package.json and src/index.ts).

Rust/AST: Integrate tree-sitter. Write grammar queries to identify exported functions, dependencies, and code complexity metrics.

Phase 3: AI Pipeline & Assembly (Week 5)

Prompt Engineering: Design the system prompt. Example: "You are an engineering VP. Analyze this AST structural data and README. Write a 2-paragraph highly technical summary of the problem this repo solves and its architectural approach in MDX format."

Rust/AI: Wire up async-openai. Execute calls in parallel using tokio::spawn.

Rust/MDX: Stitch AI responses, GitHub stats, and the user's template choice into a single monolithic MDX string saved to PostgreSQL.

Phase 4: Frontend & Delivery (Weeks 6-7)

Next.js/UI: Build the internal dashboard for repo selection and template styling.

Next.js/Dynamic: Implement app/[username]/page.tsx. Use next-mdx-remote to safely hydrate the React components embedded in the generated MDX.

Integrations: Add react-github-calendar to the MDX component map.

Phase 5: Polish & Performance (Week 8)

Caching: Implement the Redis write-through cache mechanism.

Error Handling: Add fallback UI for when a user's repo has no README or is empty.

Launch: Deploy Next.js to Vercel/Edge and Rust to a robust container runtime (e.g., Railway/Render or AWS ECS).

7. Scalability & Maintenance Strategy

GitHub API Limits: GitHub allows 5,000 requests/hour for authenticated users. By requiring OAuth before generation, we use the user's own token to fetch their data, entirely bypassing global backend rate limits.

Stateless Workers: The Rust backend should be fully stateless (relying on Postgres/Redis). This allows horizontal scaling of the Axum service across multiple containers as generation demand increases.

AST Updates: As new languages/frameworks emerge, updating the parser is as simple as adding a new tree-sitter language binding and writing a corresponding query file.