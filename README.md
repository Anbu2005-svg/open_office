# OpenOffice — Windows-only build (GenOffice-derived AI-native office suite)

OpenOffice is an AI-native desktop office suite (word processor, spreadsheet, presentations, PDF, and Markdown) derived from the GenOffice codebase. This repository contains Electron-based editors that share a TypeScript engine layer and built-in AI agent tooling. NOTE: this fork / project is built and packaged only for Windows — macOS and Linux packaging targets are intentionally omitted from CI and releases in this repository.

## Key features

- Real PDF editing with preserved fonts and in-page editing.
- Byte-preserving `.docx` round-trip: only edited paragraphs are changed.
- Built-in AI editing: block-level AI edits with snapshots and diffs.
- In-house spreadsheet engine and a Rust sidecar for streaming `.xlsx` metadata (used by the Sheets app).
- PPTX parsing & rendering with masters, smart guides, and non-destructive cropping.
- Markdown editor (Tiptap) and local Markdown → OOXML export.
- Light / dark / system UI themes implemented via design tokens (packages/ui/src/tokens.css).
- Target platform: Windows only (packaging and release artifacts are Windows installers).
- Licensed Apache-2.0 (see LICENSE). Enterprise-only modules live under `ee/` and are covered by a separate enterprise license.

## Apps (high level)

- apps/docs — word processor with docx round-trip and paragraph-patch saves.
- apps/sheets — spreadsheet built on Univer with a Rust xlsx sidecar.
- apps/slides — presentation editor with pptx engine and canvas rendering.
- apps/pdf — PDF viewer/editor using pdf.js and pdf-lib.
- apps/markdown — Tiptap-based Markdown editor.
- apps/shell — the suite shell (home screen and tabbed hosting).

## Packages (selected)

- packages/docx-engine — docx parsing, block tree, OOXML fragment generation.
- packages/pptx-engine / packages/pptx-render — pptx model + rendering.
- packages/agent-core — AI agent loop and skill composition.
- packages/ai-provider, packages/ai-search — model/provider abstraction and Genspark-integrated search/tools.
- packages/ui — shared React UI kit and design tokens (see packages/ui/src/tokens.css).

## Development (Windows-focused quick start)

Requirements
- Node.js >= 22.12, npm >= 10
- Rust toolchain (cargo) if you plan to build or run the Sheets XLSX sidecar (recommended for Sheets development)
- Windows 10+ for running packaged artifacts and testing the installer

Common commands (from a repository root)

```powershell
# install dependencies and the Electron binary
npm install

# generate sample fixtures for tests (docx)
npm run fixtures

# run all editors + shell in dev mode (Electron + Vite)
npm run dev

# run a single app (example: docs)
npm run dev:docs

# tests and typecheck
npm test
npm run typecheck

# package only for Windows (installer)
npm run dist:win
```

Notes:
- Packaging in this repository targets Windows (NSIS installer via electron-builder). macOS and Linux packaging steps are not provided here and should not be expected to work unless you add platform-specific configuration and CI.
- The `postinstall` step installs Electron; CI and packaging expect the main process to be rebuilt when necessary.
- UI theme tokens live in `packages/ui/src/tokens.css`. Follow the theming rules: UI chrome must use semantic tokens and every new token should include light/dark values.

## Architecture (short)

Editors open existing documents as the single source of truth. Parsers (docx, pptx, xlsx) build an internal block/model representation and edits produce narrow OOXML/OOXML-fragment patches that are spliced into the original package so untouched bytes remain unchanged. AI edits are applied at block granularity with preview, dry-run validation, and explicit approval gates.

## Security

See SECURITY.md for renderer sandboxing, IPC validation, and threat models around AI-generated content.

## Contributing & Enterprise

- See CONTRIBUTING.md for contribution guidelines and CODE_OF_CONDUCT.md for community rules.
- The `ee/` directory is reserved for enterprise-only modules and is under a separate enterprise license; external PRs must not modify files under `ee/` (enforced by CODEOWNERS).

## License

This repository is licensed under the Apache License 2.0 (see LICENSE). GenOffice names and logos are trademarks of the upstream project — forks should use their own branding.
