use serde::{Deserialize, Serialize};
use serde_json::Value;
use tree_sitter::Parser;

/// A single entry in a repository file tree (path + byte size).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeEntry {
    pub path: String,
    pub size: u64,
}

/// A file path and its heuristic relevance score.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoredFile {
    pub path: String,
    pub score: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AstMetadata {
    pub language: String,
    pub exported_symbols: Vec<String>,
    pub imports: Vec<String>,
    pub function_count: usize,
    pub class_count: usize,
    pub line_count: usize,
    pub frameworks: Vec<String>,
    pub complexity_score: u32,
    /// Code pattern signals detected via heuristic analysis (async, database, tested, etc.)
    #[serde(default)]
    pub signals: Vec<String>,
    /// Number of source files analyzed (1 for single-file, N for multi-file)
    #[serde(default)]
    pub file_count: usize,
}

/// A source file with its path and content, used as input to multi-file AST analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Language {
    JavaScript,
    TypeScript,
    Python,
    Rust,
    Go,
}

impl Language {
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext {
            "js" | "jsx" | "mjs" | "cjs" => Some(Self::JavaScript),
            "ts" | "tsx" => Some(Self::TypeScript),
            "py" => Some(Self::Python),
            "rs" => Some(Self::Rust),
            "go" => Some(Self::Go),
            _ => None,
        }
    }

    /// Case-insensitive parse from a language name or extension string.
    pub fn from_str_loose(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "javascript" | "js" | "jsx" => Some(Self::JavaScript),
            "typescript" | "ts" | "tsx" => Some(Self::TypeScript),
            "python" | "py" => Some(Self::Python),
            "rust" | "rs" => Some(Self::Rust),
            "go" | "golang" => Some(Self::Go),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::JavaScript => "javascript",
            Self::TypeScript => "typescript",
            Self::Python => "python",
            Self::Rust => "rust",
            Self::Go => "go",
        }
    }

    /// File extensions that constitute source code for this language.
    pub fn source_extensions(self) -> &'static [&'static str] {
        match self {
            Self::JavaScript => &[".js", ".jsx", ".mjs", ".cjs"],
            Self::TypeScript => &[".ts", ".tsx"],
            Self::Python => &[".py"],
            Self::Rust => &[".rs"],
            Self::Go => &[".go"],
        }
    }
}

pub struct AstService;

impl AstService {
    pub fn new() -> Self {
        Self
    }

    pub fn analyze(&self, source: &str, lang: Language) -> AstMetadata {
        let mut meta = AstMetadata {
            language: lang.as_str().to_owned(),
            line_count: source.lines().count(),
            ..Default::default()
        };

        let ts_lang = match lang {
            Language::JavaScript => tree_sitter_javascript::language(),
            Language::TypeScript => tree_sitter_typescript::language_typescript(),
            Language::Python => tree_sitter_python::language(),
            Language::Rust => tree_sitter_rust::language(),
            Language::Go => tree_sitter_go::language(),
        };

        let mut parser = Parser::new();
        if parser.set_language(&ts_lang).is_err() {
            tracing::warn!("failed to set tree-sitter language for {:?}", lang);
            return meta;
        }
        // 5-second hard limit per file — prevents pathological inputs from blocking the thread
        parser.set_timeout_micros(5_000_000);

        let tree = match parser.parse(source, None) {
            Some(t) => t,
            None => return meta,
        };

        let root = tree.root_node();
        self.walk_node(root, source, lang, &mut meta);

        // Deduplicate imports
        meta.imports.sort();
        meta.imports.dedup();

        meta.complexity_score = self.estimate_complexity(&meta);
        meta.signals = Self::detect_signals(source);
        meta.file_count = 1;
        meta
    }

    /// Analyzes multiple source files and merges their AST metadata.
    /// Language is inferred from file extensions; the most-common language wins.
    pub fn analyze_multi(&self, files: &[SourceFile]) -> AstMetadata {
        if files.is_empty() {
            return AstMetadata::default();
        }

        let mut merged = AstMetadata::default();
        let mut lang_votes: std::collections::HashMap<String, usize> = Default::default();

        for file in files {
            let Some(lang) = Self::detect_language_from_path(&file.path) else {
                continue;
            };
            let file_meta = self.analyze(&file.content, lang);

            *lang_votes.entry(lang.as_str().to_owned()).or_default() += 1;

            merged.function_count += file_meta.function_count;
            merged.class_count += file_meta.class_count;
            merged.line_count += file_meta.line_count;
            merged.imports.extend(file_meta.imports);
            merged.exported_symbols.extend(file_meta.exported_symbols);

            for sig in file_meta.signals {
                if !merged.signals.contains(&sig) {
                    merged.signals.push(sig);
                }
            }
        }

        merged.language = lang_votes
            .into_iter()
            .max_by_key(|(_, v)| *v)
            .map(|(l, _)| l)
            .unwrap_or_default();

        merged.imports.sort();
        merged.imports.dedup();
        merged.exported_symbols.truncate(30);
        merged.file_count = files.len();
        merged.complexity_score = self.estimate_complexity(&merged);

        merged
    }

    /// Infers the language from a file path's extension.
    pub fn detect_language_from_path(path: &str) -> Option<Language> {
        let file_name = path.rsplit('/').next().unwrap_or(path);
        let ext = file_name.rsplit('.').next()?;
        if ext == file_name {
            return None; // no extension
        }
        Language::from_extension(ext)
    }

    /// Detects code pattern signals via lightweight heuristic string matching.
    /// Returns a deduplicated list of pattern labels (e.g., "async", "database", "tested").
    pub fn detect_signals(source: &str) -> Vec<String> {
        let lower = source.to_lowercase();
        let mut signals: Vec<String> = Vec::new();

        fn has(lower: &str, patterns: &[&str]) -> bool {
            patterns.iter().any(|p| lower.contains(p))
        }

        if has(&lower, &["async ", "await ", "tokio::", "asyncio.", "go func", "goroutine"]) {
            signals.push("async".to_owned());
        }
        if has(
            &lower,
            &["#[test]", "def test_", "describe(", " test(\"", "func test", "it.each", "it(\""],
        ) {
            signals.push("tested".to_owned());
        }
        if has(
            &lower,
            &["result<", "try {", "except ", "catch (", "if err != nil", "anyhow", ".catch("],
        ) {
            signals.push("error-handling".to_owned());
        }
        if has(
            &lower,
            &["sqlx", "prisma", "mongoose", "sequelize", "gorm", "sqlalchemy", "insert into"],
        ) || (lower.contains("select ") && lower.contains(" from "))
        {
            signals.push("database".to_owned());
        }
        if has(
            &lower,
            &[
                "router.get", "router.post", "app.get(", "app.post(", "axum::router",
                "actix_web", "fetch(", "axios.", "httphandler",
            ],
        ) {
            signals.push("http-api".to_owned());
        }
        if has(&lower, &["clap::", "argparse", "cobra.", "commander()", "process.argv"]) {
            signals.push("cli".to_owned());
        }
        if has(
            &lower,
            &["torch", "tensorflow", "sklearn", "model.fit", ".predict(", "embedding", "huggingface"],
        ) {
            signals.push("machine-learning".to_owned());
        }
        if has(&lower, &["jwt", "oauth", "bearer ", "access_token", "refresh_token"]) {
            signals.push("auth".to_owned());
        }
        if has(&lower, &["usestate(", "usereducer(", "redux", "zustand", "recoil"]) {
            signals.push("state-management".to_owned());
        }

        signals
    }

    fn walk_node(
        &self,
        node: tree_sitter::Node<'_>,
        source: &str,
        lang: Language,
        meta: &mut AstMetadata,
    ) {
        match node.kind() {
            // Function counting — covers all language variants
            "function_declaration" | "function_definition" | "method_definition"
            | "function_expression" | "arrow_function" | "generator_function"
            | "generator_function_declaration" => {
                meta.function_count += 1;
            }
            // Rust functions and Go methods
            "function_item" | "method_declaration" => {
                meta.function_count += 1;
            }
            // Class / type counting
            "class_declaration" | "class_definition" => {
                meta.class_count += 1;
            }
            // Rust structs and enums as class equivalents
            "struct_item" | "enum_item" => {
                meta.class_count += 1;
            }
            // Exports (JS/TS only)
            "export_statement" => {
                if let Some(name) = self.extract_export_name(node, source) {
                    meta.exported_symbols.push(name);
                }
            }
            // Imports — language-specific handling
            "import_statement" => match lang {
                Language::JavaScript | Language::TypeScript => {
                    if let Some(path) = self.extract_string_import(node, source) {
                        if !path.starts_with('.') && !path.starts_with('/') {
                            meta.imports.push(path);
                        }
                    }
                }
                Language::Python => {
                    if let Some(name) = self.extract_python_module(node, source) {
                        meta.imports.push(name);
                    }
                }
                _ => {}
            },
            "import_from_statement" if lang == Language::Python => {
                if let Some(name) = self.extract_python_module(node, source) {
                    meta.imports.push(name);
                }
            }
            "use_declaration" if lang == Language::Rust => {
                if let Some(krate) = self.extract_rust_crate(node, source) {
                    meta.imports.push(krate);
                }
            }
            "import_declaration" => match lang {
                Language::Go => self.extract_go_imports(node, source, meta),
                Language::JavaScript | Language::TypeScript => {
                    if let Some(path) = self.extract_string_import(node, source) {
                        if !path.starts_with('.') && !path.starts_with('/') {
                            meta.imports.push(path);
                        }
                    }
                }
                _ => {}
            },
            // Go struct/interface types
            "type_declaration" if lang == Language::Go => {
                meta.class_count += 1;
            }
            _ => {}
        }

        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                self.walk_node(cursor.node(), source, lang, meta);
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
    }

    /// Extracts the name identifier from an export statement.
    fn extract_export_name(&self, node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                let child = cursor.node();
                match child.kind() {
                    "function_declaration"
                    | "class_declaration"
                    | "generator_function_declaration"
                    | "lexical_declaration"
                    | "variable_declaration" => {
                        if let Some(name) = self.find_first_identifier(child, source) {
                            return Some(name);
                        }
                    }
                    "identifier" => {
                        if let Ok(text) = child.utf8_text(source.as_bytes()) {
                            if !matches!(text, "export" | "default") {
                                return Some(text.to_owned());
                            }
                        }
                    }
                    _ => {}
                }
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
        None
    }

    /// Finds the first non-keyword identifier in a declaration node.
    fn find_first_identifier(&self, node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                let child = cursor.node();
                if child.kind() == "identifier" {
                    if let Ok(text) = child.utf8_text(source.as_bytes()) {
                        if !matches!(
                            text,
                            "function"
                                | "class"
                                | "const"
                                | "let"
                                | "var"
                                | "async"
                                | "export"
                                | "default"
                        ) {
                            return Some(text.to_owned());
                        }
                    }
                }
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
        None
    }

    /// Extracts a quoted string import path for JS/TS.
    fn extract_string_import(&self, node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                let child = cursor.node();
                if matches!(
                    child.kind(),
                    "string" | "string_literal" | "interpreted_string_literal"
                ) {
                    if let Ok(text) = child.utf8_text(source.as_bytes()) {
                        let trimmed = text.trim_matches(|c| c == '"' || c == '\'');
                        if !trimmed.is_empty() {
                            return Some(trimmed.to_owned());
                        }
                    }
                }
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
        None
    }

    /// Extracts the top-level module name from Python import statements.
    fn extract_python_module(&self, node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                let child = cursor.node();
                if child.kind() == "dotted_name" {
                    if let Ok(text) = child.utf8_text(source.as_bytes()) {
                        let top = text.split('.').next().unwrap_or(text).trim();
                        if !top.is_empty() {
                            return Some(top.to_owned());
                        }
                    }
                }
                // Handles bare `import foo` where child is identifier directly
                if child.kind() == "identifier" {
                    if let Ok(text) = child.utf8_text(source.as_bytes()) {
                        if !matches!(text, "import" | "from") {
                            return Some(text.to_owned());
                        }
                    }
                }
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
        None
    }

    /// Extracts the top-level crate name from a Rust use declaration.
    fn extract_rust_crate(&self, node: tree_sitter::Node<'_>, source: &str) -> Option<String> {
        if let Ok(text) = node.utf8_text(source.as_bytes()) {
            let stripped = text
                .trim_start_matches("use ")
                .trim_end_matches(';')
                .trim()
                .trim_start_matches('{');
            let first = stripped.split("::").next()?.trim();
            if !matches!(first, "crate" | "super" | "self" | "std" | "") {
                return Some(first.to_owned());
            }
        }
        None
    }

    /// Recursively collects Go import paths from an import_declaration node.
    fn extract_go_imports(
        &self,
        node: tree_sitter::Node<'_>,
        source: &str,
        meta: &mut AstMetadata,
    ) {
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                let child = cursor.node();
                if child.kind() == "interpreted_string_literal" {
                    if let Ok(text) = child.utf8_text(source.as_bytes()) {
                        let path = text.trim_matches('"');
                        if !path.starts_with('.') && !path.is_empty() {
                            meta.imports.push(path.to_owned());
                        }
                    }
                } else {
                    self.extract_go_imports(child, source, meta);
                }
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
    }

    fn estimate_complexity(&self, meta: &AstMetadata) -> u32 {
        let raw = (meta.function_count * 3 + meta.class_count * 5 + meta.imports.len()) as f32;
        let score = (raw.sqrt() * 10.0) as u32;
        score.min(100)
    }

    pub fn infer_frameworks(&self, imports: &[String], dep_file: Option<&str>) -> Vec<String> {
        let mut frameworks = Vec::new();

        let known: &[(&str, &str)] = &[
            // JS/TS — frontend
            ("react", "React"),
            ("next", "Next.js"),
            ("vue", "Vue"),
            ("angular", "Angular"),
            ("svelte", "Svelte"),
            ("solid-js", "Solid.js"),
            ("remix", "Remix"),
            ("astro", "Astro"),
            ("nuxt", "Nuxt"),
            // JS/TS — backend
            ("express", "Express"),
            ("fastify", "Fastify"),
            ("hono", "Hono"),
            ("koa", "Koa"),
            ("@nestjs", "NestJS"),
            ("nestjs", "NestJS"),
            // DB / ORM
            ("prisma", "Prisma"),
            ("drizzle-orm", "Drizzle ORM"),
            ("mongoose", "Mongoose"),
            ("sequelize", "Sequelize"),
            ("typeorm", "TypeORM"),
            ("knex", "Knex"),
            // API / transport
            ("@trpc", "tRPC"),
            ("graphql", "GraphQL"),
            ("apollo", "Apollo"),
            // Testing
            ("vitest", "Vitest"),
            ("jest", "Jest"),
            ("playwright", "Playwright"),
            ("cypress", "Cypress"),
            // CSS / UI
            ("tailwindcss", "Tailwind CSS"),
            ("@mui", "Material UI"),
            ("@chakra-ui", "Chakra UI"),
            ("@radix-ui", "Radix UI"),
            // Rust
            ("axum", "Axum"),
            ("actix-web", "Actix Web"),
            ("rocket", "Rocket"),
            ("warp", "Warp"),
            ("tokio", "Tokio"),
            ("sqlx", "SQLx"),
            ("diesel", "Diesel"),
            ("sea-orm", "Sea-ORM"),
            ("tonic", "Tonic (gRPC)"),
            ("serde", "Serde"),
            ("tauri", "Tauri"),
            // Python
            ("django", "Django"),
            ("flask", "Flask"),
            ("fastapi", "FastAPI"),
            ("sqlalchemy", "SQLAlchemy"),
            ("alembic", "Alembic"),
            ("celery", "Celery"),
            ("pydantic", "Pydantic"),
            ("pytest", "pytest"),
            ("numpy", "NumPy"),
            ("pandas", "Pandas"),
            ("torch", "PyTorch"),
            ("tensorflow", "TensorFlow"),
            ("sklearn", "scikit-learn"),
            ("transformers", "HuggingFace"),
            // Go
            ("gin-gonic", "Gin"),
            ("gin", "Gin"),
            ("labstack/echo", "Echo"),
            ("gofiber", "Fiber"),
            ("go-chi", "Chi"),
            ("gorm", "GORM"),
            ("entgo", "Ent"),
            ("grpc", "gRPC"),
        ];

        for import in imports {
            for (key, label) in known {
                if import.contains(key) && !frameworks.contains(&label.to_string()) {
                    frameworks.push(label.to_string());
                }
            }
        }

        if let Some(dep) = dep_file {
            for (key, label) in known {
                if dep.contains(key) && !frameworks.contains(&label.to_string()) {
                    frameworks.push(label.to_string());
                }
            }
        }

        frameworks
    }

    /// Scores a flat file tree and returns the top `max_files` candidates.
    /// Language is used to filter by source extension; pass `None` to accept any extension.
    pub fn score_file_tree(
        &self,
        entries: &[TreeEntry],
        lang: Option<Language>,
        max_files: usize,
    ) -> Vec<ScoredFile> {
        let exts: &[&str] = lang.map(|l| l.source_extensions()).unwrap_or(&[]);

        let mut scored: Vec<ScoredFile> = entries
            .iter()
            .filter_map(|e| {
                let s = Self::score_path(&e.path, e.size, exts);
                if s >= 0 { Some(ScoredFile { path: e.path.clone(), score: s }) } else { None }
            })
            .collect();

        scored.sort_by(|a, b| b.score.cmp(&a.score));
        scored.truncate(max_files);
        scored
    }

    /// Heuristic score for a single file path. Returns -1 to exclude the file.
    fn score_path(path: &str, size: u64, exts: &[&str]) -> i32 {
        let lower = path.to_lowercase();
        let file_name = lower.rsplit('/').next().unwrap_or(&lower);
        let depth = path.chars().filter(|&c| c == '/').count() as i32;

        // Hard-exclude generated / dependency / build directories
        const EXCLUDED_DIRS: &[&str] = &[
            "node_modules/", ".git/", "dist/", "build/", "target/",
            "vendor/", "__pycache__/", ".cache/", "coverage/", ".next/",
            "out/", ".turbo/", ".vercel/", "generated/", ".nyc_output/",
        ];
        if EXCLUDED_DIRS.iter().any(|d| lower.contains(d)) {
            return -1;
        }

        // Exclude test / fixture / mock files
        const TEST_PATTERNS: &[&str] = &[
            ".test.", ".spec.", "_test.", "_spec.",
            "/test/", "/tests/", "/spec/", "/__tests__/",
            "/e2e/", "/testdata/", "/fixtures/", "/mocks/", "/__mocks__/",
        ];
        if TEST_PATTERNS.iter().any(|p| lower.contains(p)) {
            return -1;
        }

        // Exclude non-source file types (applies mainly when lang is unknown)
        const SKIP_EXT: &[&str] = &[
            ".d.ts", ".min.js", ".min.css", ".map", ".lock", ".sum",
            ".yaml", ".yml", ".json", ".md", ".txt", ".env",
            ".toml", ".sh", ".bash", ".zsh", ".proto", ".graphql", ".sql",
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
            ".woff", ".woff2", ".ttf", ".eot",
        ];
        if SKIP_EXT.iter().any(|e| file_name.ends_with(e)) {
            return -1;
        }

        // Must match a known source extension when the language is identified
        if !exts.is_empty() && !exts.iter().any(|e| file_name.ends_with(*e)) {
            return -1;
        }

        // Size gates: ignore stubs (< 100 B) and likely-generated large files (> 150 KB)
        if size < 100 || size > 150_000 {
            return -1;
        }

        let mut score: i32 = 400;

        // Depth: prefer files 1–3 levels deep over root-level config blobs
        score += match depth {
            0 => -30,
            1 => 80,
            2 => 60,
            3 => 30,
            4 => 0,
            d => -(d - 4) * 15,
        };

        // Core directory bonus — first match wins
        const CORE_DIRS: &[(&str, i32)] = &[
            ("core/", 120), ("engine/", 110), ("domain/", 100),
            ("src/", 90), ("lib/", 90), ("pkg/", 80), ("internal/", 80),
            ("services/", 80), ("service/", 80), ("usecase/", 75), ("usecases/", 75),
            ("handlers/", 70), ("handler/", 70), ("api/", 65),
            ("routes/", 65), ("router/", 65), ("cmd/", 70), ("app/", 60),
            ("models/", 60), ("model/", 60), ("schema/", 60),
            ("store/", 65), ("repository/", 65), ("repositories/", 65),
            ("middleware/", 55), ("controllers/", 60), ("controller/", 60),
        ];
        for (dir, bonus) in CORE_DIRS {
            if lower.contains(dir) {
                score += bonus;
                break;
            }
        }

        // Entry-point / key-module name bonus (match on file stem)
        let stem = file_name.rfind('.').map(|i| &file_name[..i]).unwrap_or(file_name);
        const ENTRY_NAMES: &[(&str, i32)] = &[
            ("main", 300), ("lib", 250), ("index", 220), ("app", 200),
            ("server", 180), ("mod", 160), ("__init__", 150),
            ("cli", 140), ("cmd", 140), ("run", 120),
            ("core", 110), ("engine", 110), ("api", 100),
            ("service", 100), ("services", 95), ("handler", 90),
            ("router", 90), ("routes", 90), ("store", 85),
            ("schema", 80), ("model", 80), ("controller", 80),
            ("resolver", 80), ("middleware", 70), ("config", 50),
        ];
        for (name, bonus) in ENTRY_NAMES {
            if stem == *name {
                score += bonus;
                break;
            }
        }

        // Size bonus: meaningful files tend to be 500 B – 20 KB
        score += match size {
            500..=5_000 => 40,
            5_001..=20_000 => 50,
            20_001..=60_000 => 20,
            _ => 0,
        };

        score
    }
}

/// Serializes `AstMetadata` to a JSON value for database storage.
pub fn ast_metadata_to_json(meta: &AstMetadata) -> Value {
    serde_json::to_value(meta).unwrap_or(Value::Null)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn analyzes_typescript_functions() {
        let svc = AstService::new();
        let source = r#"
            export function greet(name: string): string {
                return `Hello, ${name}`;
            }
            export const add = (a: number, b: number) => a + b;
        "#;
        let meta = svc.analyze(source, Language::TypeScript);
        assert_eq!(meta.language, "typescript");
        assert!(meta.function_count >= 1, "should count greet()");
        assert!(meta.exported_symbols.contains(&"greet".to_string()));
    }

    #[test]
    fn counts_arrow_functions() {
        let svc = AstService::new();
        let source = r#"
            const double = (x: number) => x * 2;
            const triple = (x: number) => x * 3;
        "#;
        let meta = svc.analyze(source, Language::TypeScript);
        assert!(meta.function_count >= 2, "should count arrow functions");
    }

    #[test]
    fn extracts_python_imports() {
        let svc = AstService::new();
        let source = r#"
import requests
import os.path
from flask import Flask
from django.db import models
        "#;
        let meta = svc.analyze(source, Language::Python);
        assert!(meta.imports.contains(&"requests".to_string()));
        assert!(meta.imports.contains(&"flask".to_string()));
        assert!(meta.imports.contains(&"django".to_string()));
    }

    #[test]
    fn extracts_rust_crate_imports() {
        let svc = AstService::new();
        let source = r#"
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
        "#;
        let meta = svc.analyze(source, Language::Rust);
        assert!(meta.imports.contains(&"tokio".to_string()));
        assert!(meta.imports.contains(&"serde".to_string()));
        assert!(!meta.imports.contains(&"std".to_string()), "std should be filtered");
    }

    #[test]
    fn infers_react_framework() {
        let svc = AstService::new();
        let imports = vec!["react".to_string(), "react-dom".to_string()];
        let frameworks = svc.infer_frameworks(&imports, None);
        assert!(frameworks.contains(&"React".to_string()));
    }

    #[test]
    fn complexity_scales_reasonably() {
        let svc = AstService::new();
        let small = AstMetadata { function_count: 3, class_count: 0, imports: vec![], ..Default::default() };
        let medium = AstMetadata { function_count: 15, class_count: 2, imports: vec!["a".into(), "b".into(), "c".into()], ..Default::default() };
        let large = AstMetadata { function_count: 50, class_count: 10, imports: (0..20).map(|i| i.to_string()).collect(), ..Default::default() };

        let s = svc.estimate_complexity(&small);
        let m = svc.estimate_complexity(&medium);
        let l = svc.estimate_complexity(&large);

        assert!(s < m, "small should be less complex than medium");
        assert!(m < l, "medium should be less complex than large");
        assert!(l <= 100, "complexity capped at 100");
    }

    #[test]
    fn handles_unknown_language_gracefully() {
        let result = Language::from_extension("xyz");
        assert!(result.is_none());
    }
}
