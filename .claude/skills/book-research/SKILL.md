---
name: book-research
description: Web検索を行い結果をknowledges/に保存する。トピック指定または目次に基づく網羅的検索。
argument-hint: "[トピック] (省略時は目次に基づいて網羅的に検索)"
allowed-tools: WebSearch, WebFetch, Read, Write, Glob
---

# Web検索・知見保存スキル

## 使い方

- `/book-research <トピック>` - 特定トピックを検索して保存
- `/book-research` - 現在の目次に基づいて網羅的に検索

## 検索対象

$ARGUMENTS

## 特定トピック検索

1. 指定されたトピックについてWeb検索を実行する
2. 信頼性の高いソースを優先的に収集する
3. 結果を構造化してmarkdownファイルに保存する
4. `knowledges/YYYY-MM-DD-<topic-slug>.md` として保存する

## 網羅的検索（トピックなし）

1. `src/chapters/` の目次構造を読み込む
2. 各章・セクションに関連するトピックを抽出する
3. 既存の `knowledges/` と照合し、不足分を特定する
4. 不足トピックについてWeb検索を実行する
5. 各トピックごとにknowledgesファイルを作成する

## 出力フォーマット

`knowledges/YYYY-MM-DD-topic-name.md`:

```markdown
# トピック名

検索日: YYYY-MM-DD

## 概要

（トピックの要約）

## 主要な知見

### 知見1

- 内容の説明
- 出典: [タイトル](URL)

### 知見2

- 内容の説明
- 出典: [タイトル](URL)

## 参考リンク

- [リンク1](URL) - 説明

## 本書への適用

このトピックは以下の章で活用できます。

- 第X章: 〜の文脈で使用
```

## 注意事項

- 出典URLは必ず記録する
- 信頼性の高いソース（公式ドキュメント、学術論文）を優先する
- 著作権に配慮し、引用は適切な範囲で行う
