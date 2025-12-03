# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Book repository template for writing books in Markdown and generating HTML/XHTML/EPUB outputs. Uses Gemini API for batch image generation.

## Commands

```bash
# Build
bun run build              # Build all formats (HTML, XHTML, EPUB, Site)
bun run build:html         # HTML only
bun run build:xhtml        # XHTML only
bun run build:epub         # EPUB only
bun run build:site         # GitHub Pages site (chapters + single page + EPUB)
bun run check:epub         # Validate EPUB with epubcheck

# Linting (strict - exceptions via inline markers only)
bun run lint               # Run all linters
bun run lint:fix           # Auto-fix lint errors
bun run lint:md            # markdownlint only
bun run lint:text          # textlint only

# Image generation (requires GEMINI_API_KEY env var)
bun run images:prompts     # Generate batch-requests.jsonl from src/images.json
bun run images:submit      # Upload JSONL and submit batch job to Gemini
bun run images:download    # Download generated images to src/assets/images/
```

## Architecture

**Build Pipeline** (`scripts/build.ts`):
- Reads Markdown from `src/chapters/` (sorted alphabetically)
- Processes via unified: remark-parse → remark-gfm → remark-cjk-friendly → remark-rehype → rehype-stringify
- Outputs to `dist/html/`, `dist/xhtml/`, `dist/book.epub`
- Book metadata from `book.json`

**Site Output** (`dist/site/`):
- `index.html`: 目次ページ
- `chapters/*.html`: 章ごとの個別ページ（前後ナビゲーション付き）
- `single.html`: 全章を1ページにまとめたページ
- `book.epub`: EPUBダウンロード用
- `images/`: 画像ファイル

**Image Generation** (`scripts/generate-image-batch.ts`, `submit-image-batch.ts`, `download-images.ts`):
- Prompts defined in `src/images.json`
- Uses Gemini Batch API with model `gemini-3-pro-image-preview`
- Supports aspect ratios: 3:4, 1:1, 4:3

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Lint → Build EPUB → Validate → Build Site → Deploy to GitHub Pages
- PRではビルドのみ、mainブランチへのpushでデプロイ

## Linting Policy

Both linters are configured strictly. Do NOT relax global rules. Use inline markers for exceptions:

```markdown
<!-- markdownlint-disable MD033 -->
<custom-html />
<!-- markdownlint-enable MD033 -->

<!-- textlint-disable ja-technical-writing/no-exclamation-question-mark -->
素晴らしい！
<!-- textlint-enable -->
```

**Key textlint rules**: ですます調統一、句点(。)必須、文長150字以内、読点3個以内

## Bun Usage

Use Bun instead of Node.js:
- `bun run <script>` instead of npm/yarn
- `Bun.file()` for file I/O
- Bun automatically loads `.env`
