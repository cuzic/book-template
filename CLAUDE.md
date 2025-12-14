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
bun run lint:chapters      # src/chapters/ のみチェック
bun run lint:chapters:fix  # src/chapters/ のみ修正

# 夜間バッチ処理
bun run batch-improve      # Claude CLI で lint 修正を繰り返す

# Image generation (requires GEMINI_API_KEY env var)
bun run images:prompts     # Generate batch-requests.jsonl from src/images.json
bun run images:submit      # Upload JSONL and submit batch job to Gemini
bun run images:download    # Download generated images to src/assets/images/
```

## Architecture

**Source Files**:
- `src/toc.md`: 目次（単一ファイル、lintチェック不要）
- `src/chapters/*.md`: 本文（章ごと、lintチェック必須）

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
- Resolution: **2K** (高品質出版物向け)
- Supports aspect ratios: 3:4, 1:1, 4:3
- Workflow: Reviewer→Illustrator→Publisher (バッチ処理でコスト削減)

**GitHub Actions**:

`.github/workflows/deploy.yml`:
- Lint → Build EPUB → Validate → Build Site → Deploy to GitHub Pages
- PRではビルドのみ、mainブランチへのpushでデプロイ

`.github/workflows/nightly-batch.yml`:
- 毎日 JST 3:00 に実行（スケジュール）
- Claude CLI で lint エラーを自動修正
- 修正があれば自動コミット・プッシュ
- 手動実行も可能（workflow_dispatch）
- 要: `ANTHROPIC_API_KEY` シークレット

## Linting Policy

**対象**: `src/chapters/*.md`（本文のみ）
**対象外**: `src/toc.md`（目次）
**実行タイミング**: 夜間バッチ処理（`/book-batch-improve`）

執筆直後のlintは不要。まずGitHub Pagesに公開し、人間がレビューする。
lintチェックと修正は夜間バッチで行う。

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

## Agent Team (8役割)

書籍執筆を8つのエージェントで分担します。

| 役割 | 責務 | ファイル所有 |
|------|------|-------------|
| **Author** | 全体統括、テーマ決定、最終判断 | `book.json` |
| **Researcher** | Web検索、知見収集 | `knowledges/*.md` |
| **Writer** | 章の執筆 | `src/chapters/**` |
| **Reviewer** | 批判的レビュー、図解箇所特定 | `knowledges/reviews/**` |
| **Illustrator** | 図解プロンプト作成 | `src/images.json` |
| **Editor** | 文体統一、推敲、lint修正 | `src/chapters/**` (Writer後) |
| **Publisher** | ビルド、検証、画像生成、デプロイ | `dist/**` |
| **Architect** | スキル・プロセス改善 | `.claude/**`, `knowledges/process/**` |

チーム起動例:
```
Create an agent team for writing a book about "Pythonデータ分析入門".
Spawn teammates: Researcher, Writer, Reviewer, Illustrator, Editor, Publisher, Architect.
```

## Skills (執筆ワークフロー)

```
/book-outline <テーマ>      # テーマから目次を生成
/book-outline               # knowledgesを考慮して目次を改善
/book-research <トピック>   # Web検索してknowledges/に保存
/book-research              # 目次に基づいて網羅的に検索
/book-review                # 目次を批判的にレビュー（図解提案含む）
/book-review --iterations 3 # レビュー→改善を3回繰り返す
/book-apply                 # レビュー結果を目次に反映
/book-write <章番号>        # 章を執筆 → すぐに公開
/book-illustrate [章番号]   # 図解プロンプトを作成しimages.jsonに追加
/book-generate-images       # Geminiバッチで画像を生成
/book-batch-improve         # 夜間バッチ処理（lint修正、改善）
/book-approve <マイルストーン> # 人間の承認を記録
```

## ワークフロー段階と人間チェックポイント

執筆は3つのフェーズに分かれ、フェーズ移行時に**人間の承認**が必要です。

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 企画・目次作成                                      │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ outline │ → │research │ → │ review  │ → │  apply  │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                              (繰り返し可)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ 🛑 人間の承認    │  ← 目次の承認（必須）
                    │ /book-approve   │
                    │    outline      │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 執筆・公開                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────────────┐            │
│  │  write  │ → │ publish │ → │ 👀 人間レビュー  │            │
│  └─────────┘   └─────────┘   └─────────────────┘            │
│                    ↓                                         │
│              ┌──────────────┐                                │
│              │ 🌙 夜間バッチ │  lint修正、改善                │
│              │ batch-improve│                                │
│              └──────────────┘                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ 🛑 人間の承認    │  ← 出版前承認（必須）
                    │ /book-approve   │
                    │    publish      │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 最終出版                                            │
│  ┌─────────┐   ┌─────────┐                                  │
│  │  build  │ → │ deploy  │                                  │
│  └─────────┘   └─────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### チェックポイント一覧

| チェックポイント | タイミング | 必須 |
|----------------|-----------|------|
| `outline` | 目次完成時 | ✅ |
| `chapter-XX` | 各章完成時 | オプション |
| `publish` | 出版前 | ✅ |

**重要**: Author エージェントはチェックポイントで必ず停止し、人間の承認を得てから次のフェーズに進みます。

## Knowledge Directories

- `knowledges/*.md` - 調査結果（Researcher管理）
- `knowledges/reviews/*.md` - レビュー結果（Reviewer管理）
- `knowledges/process/*.md` - プロセス知見（Architect管理）
- `knowledges/approvals/*.md` - 人間による承認記録（Author管理）

## Bun Usage

Use Bun instead of Node.js:
- `bun run <script>` instead of npm/yarn
- `Bun.file()` for file I/O
- Bun automatically loads `.env`
