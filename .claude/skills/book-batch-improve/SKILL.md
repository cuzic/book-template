---
name: book-batch-improve
description: 夜間バッチ処理でlintエラーを修正し、文章を改善する。
argument-hint: "[--dry-run] (実際に修正せず問題のみ表示)"
---

# 夜間バッチ改善スキル

人間が寝ている間に実行する、文章品質改善のバッチ処理です。

## 想定実行タイミング

- 夜間（人間が作業していない時間）
- 執筆が一段落した後
- GitHub Pagesで人間レビュー後

## 処理内容

### 1. Lintチェックと修正

```bash
# エラー確認
bun run lint

# 自動修正可能なものを修正
bun run lint:fix
```

### 2. 手動修正が必要なエラー

自動修正できないエラーは以下の方針で対応する。

#### textlintエラー

| エラー | 対応 |
| ---- | ---- |
| 助詞の連続 | 文を書き換える |
| 文が長すぎる | 文を分割する |
| 句点がない | 句点を追加する |
| ですます調の不統一 | 統一する |

#### markdownlintエラー

| エラー | 対応 |
| ---- | ---- |
| 見出しレベル | 修正する |
| 空行不足 | 空行を追加する |
| インラインHTML | マーカーでdisableまたは書き換え |

### 3. disableマーカーのレビュー

既存のdisableマーカーを確認する。

```bash
grep -r "textlint-disable" src/chapters/
grep -r "markdownlint-disable" src/chapters/
```

- 代替表現で書き換え可能か検討
- 本当に必要なdisableか再評価
- 頻出パターンはArchitectに報告

## 出力

### バッチ処理レポート

`knowledges/reviews/YYYY-MM-DD-batch-improve.md`に保存する。

```markdown
# 夜間バッチ改善レポート

実行日時: YYYY-MM-DD HH:MM

## Lint結果

- 検出エラー: N件
- 自動修正: M件
- 手動修正: K件

## 修正内容

### ファイル: src/chapters/01-introduction.md

| 行 | 問題 | 修正内容 |
| ---- | ---- | ---- |
| 15 | 助詞「を」連続 | 「〜を〜する」→「〜の〜」に変更 |
| 42 | 文が長い | 2文に分割 |

## 残課題

- [ ] XX行目: 要検討（複数の修正案あり）

## disableマーカー状況

- 現在のdisable数: N箇所
- 今回追加: M箇所
- 削減可能: K箇所
```

## --dry-run オプション

問題の検出のみ行い、修正しない。

```bash
bun run lint 2>&1 | tee lint-report.txt
```

## 注意事項

- 人間が作業中の時間帯には実行しない
- 大きな変更は人間の確認を求める
- 修正後は必ずビルドが通ることを確認する
- GitHub Pagesを更新して人間が確認できるようにする
