---
name: book-illustrate
description: Reviewerの図解提案からプロンプトを作成し、images.jsonに追加する。
argument-hint: "[章番号] (省略時は全章の図解提案を処理)"
---

# 図解プロンプト作成スキル

Reviewerからの図解提案を受け取り、Gemini画像生成用のプロンプトを作成します。

## 前提条件

- `knowledges/reviews/` にReviewerの図解提案が存在すること
- 図解提案に該当箇所、種類、アスペクト比が記載されていること

## 実行手順

### 1. 図解提案の読み込み

```bash
# 最新のレビュー結果を確認
ls -la knowledges/reviews/

# 図解提案セクションを確認
grep -A 20 "## 図解提案" knowledges/reviews/*.md
```

### 2. 該当箇所の内容を確認

提案された箇所の文章を読み、以下を理解する:
- 何を説明しているか
- どのような視覚化が効果的か
- 読者にとって重要なポイント

### 3. プロンプトの作成

以下のテンプレートを使用:

```
A clean, professional technical illustration showing [主題].
Style: Modern, minimalist diagram suitable for a technical book.
Layout: [構図の説明]
Colors: [配色の指示 - 書籍テーマに合わせる]
Elements: [含める要素のリスト]
Text labels: [日本語ラベル or "No text labels"]
Background: Clean white or light gray
Resolution: 2K quality
```

### 4. images.json への追加

`src/images.json` に以下の形式で追加:

```json
{
  "name": "chapter{XX}-{種類}-{内容}",
  "prompt": "作成したプロンプト",
  "aspectRatio": "3:4 | 1:1 | 4:3",
  "chapter": "XX",
  "section": "セクション名",
  "description": "図の説明（管理用）"
}
```

## アスペクト比の選択

| 種類 | 推奨アスペクト比 |
|------|-----------------|
| フロー図、手順図 | 3:4（縦長） |
| 概念図、シンボル | 1:1（正方形） |
| 比較表、構造図 | 4:3（横長） |

## 出力

### 報告フォーマット

```markdown
# 図解プロンプト作成完了

## 処理した提案

| # | 名前 | 章 | アスペクト比 |
|---|------|-----|-------------|
| 1 | chapter01-flow-xxx | 01 | 3:4 |
| 2 | chapter02-compare-xxx | 02 | 4:3 |

## images.json の状態

- 既存: N 件
- 追加: M 件
- 合計: N+M 件

## 次のステップ

Publisherに `/book-generate-images` の実行を依頼してください。
```

## 注意事項

- プロンプトは英語で記述する（Geminiの最適化のため）
- 日本語ラベルが必要な場合はプロンプト内で明示的に指定
- 同じ名前の画像が既に存在する場合は上書きしない（別名を使う）
