# AGENTS.md - Global Rules for AI Assistants

This file configures how AI assistants (like OpenCode, Claude, GitHub Copilot) should help with our codebase.

> **For new developers**: See [ONBOARDING.md](./ONBOARDING.md) for a friendly introduction.

---

## Table of Contents

1. [Security](#security)
2. [Output Style](#output-style)
3. [Code Quality](#code-quality)
4. [Runtime & Tooling](#runtime--tooling)
5. [Testing](#testing)
6. [Git Workflow](#git-workflow)
7. [Project Planning](#project-planning)
8. [New Project Creation](#new-project-creation)
9. [Observability](#observability)
10. [Architecture](#architecture)
11. [Tools](#tools)

---

## Security
- NEVER commit secrets, API keys, or credentials to code
- Always validate and sanitize user inputs
- Use environment variables for sensitive configuration
- Check for known vulnerabilities in dependencies before adding them
- Follow principle of least privilege for permissions

## Output Style
- Be concise - avoid unnecessary explanations
- Answer directly without preamble or postamble
- Use 1-3 sentences unless more detail is requested
- One word answers are best for simple questions

## Code Quality
- Follow existing code patterns and conventions in the project
- Run lint and typecheck after making changes
- Write tests for new functionality
- Keep changes minimal and focused

## Runtime & Tooling
- **Bun first**: Use Bun for runtime, bundler, package manager, and test runner
- Node.js only as fallback when Bun doesn't support a specific feature
- No TypeScript - use vanilla JavaScript with JSDoc for type annotations
- Prefer native browser/Node APIs over external libraries (e.g., fetch over axios)

## Testing
- **TDD required**: Write tests before implementation
- **Coverage target**: 85% minimum
- Unit tests for isolated logic
- E2E tests with Playwright (headless mode)
- **Cross-browser testing**: Always test on Chromium, Chrome, Firefox
- **Real device testing**: Use Appium for mobile devices (Android, iOS)
- Run tests with `bun test`

## Git Workflow
- **Platform**: GitHub (public) and self-hosted Gitea (internal)
- **Gitea instance**: `https://gitea.<YOUR_DOMAIN>` (placeholder)
- **Commit to Gitea only**: All commits go to our Gitea instance
- Feature branches only - never commit directly to main
- Main branch is protected - changes via PR merge only
- Conventional commits format (feat:, fix:, docs:, refactor:, test:, chore:)
- Update CHANGELOG.md for user-facing changes
- PR title follows conventional commit format

## Project Planning
- **Plan before build**: Always create a plan before implementation
- Create task in Gitea's issue page related to the project
- Reference issue number in commits and PRs

## New Project Creation
- All new projects must start from template:
  - Backend: `https://gitea.<YOUR_DOMAIN>/<ORG>/template-default`
  - Frontend: `https://gitea.<YOUR_DOMAIN>/<ORG>/template-frontend`
- Create repo via PR on: `https://gitea.<YOUR_DOMAIN>/<ORG>/repo-automation`
- This triggers automation to clone template with:
  - Observability (OTel, SigNoz)
  - Logging & Tracing
  - Security logs
  - SAST, DAST, SCA
  - CI/CD Pipelines
- Frontend templates include:
  - PWA with offline support
  - Cross-browser testing (Chromium, Chrome, Firefox)
  - Real device testing (Appium)
  - Store-ready app generation (Android, iOS)
  - Desktop apps (Tauri for Windows, macOS, Linux)

## Observability
- OpenTelemetry (OTel) for tracing and metrics
- SigNoz as observability backend
- LGTM stack (Loki, Grafana, Tempo, Mimir) for logging and metrics
- Instrument all services with OTel SDK

## Architecture
- **No SPA frameworks** (React, Vue, Svelte, etc.)
- Plain HTML, CSS, JavaScript - consume APIs directly
- Design System via OpenPencil
- Component documentation in Storybook
- **PWA-first**: Build as PWA, then wrap for stores (Android/iOS)
- **Desktop apps**: Use Tauri for Windows, macOS, Linux builds
- Store-ready app generation from PWA codebase

## Tools
- Prefer the Read, Glob, and Grep tools for searching code
- Use the Edit tool for file modifications
- Run lint/typecheck commands when changes are complete

## MCP Servers
Available MCP servers for extended capabilities:
- **pencil**: OpenPencil design tool integration
- **filesystem**: Enhanced file operations on ~/code
- **playwright**: E2E test debugging and browser automation
- **github**: GitHub API for public repositories
- **gitea**: Self-hosted Gitea integration (issues, PRs, repos)
- **memory**: Persistent context across sessions
- **sequential-thinking**: Complex problem decomposition

## Recommended Global Tools
Install these globally for improved workflow:
```bash
# Faster linter/formatter (alternative to eslint/prettier)
bun install -g biome

# Git hooks manager (alternative to manual .githooks)
bun install -g lefthook

# Find unused exports and dependencies
bun install -g knip

# Interactive CLI prompts
bun install -g @inquirer/cli
```

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->
