---
name: book-generate-images
description: images.jsonからJSONLを生成し、Geminiバッチで画像を生成する。
argument-hint: "[--dry-run] (実際に送信せずJSONLのみ生成)"
---

# 画像バッチ生成スキル

`src/images.json` のプロンプトから画像をバッチ生成します。

## 前提条件

- `GEMINI_API_KEY` 環境変数が設定されていること
- `src/images.json` にプロンプトが定義されていること

## 実行手順

### 1. images.json の確認

```bash
# プロンプト数を確認
cat src/images.json | jq '.images | length'

# 内容をプレビュー
cat src/images.json | jq '.images[] | {name, aspectRatio}'
```

### 2. JSONLファイルの生成

```bash
bun run images:prompts
```

生成されるファイル: `batch-requests.jsonl`

各行の形式:
```json
{
  "request": {
    "model": "gemini-3-pro-image-preview",
    "contents": [{"parts": [{"text": "プロンプト"}]}],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageSizeConfig": {
        "resolution": "2K",
        "aspectRatio": "3:4"
      }
    }
  },
  "metadata": {"name": "画像名"}
}
```

### 3. バッチジョブの送信

```bash
bun run images:submit
```

- JSONLをFile APIでアップロード
- Batch APIでジョブを作成
- ジョブIDを `batch-job-id.txt` に保存

### 4. 完了待機とダウンロード

```bash
bun run images:download
```

- ジョブの完了を確認
- 結果をダウンロード
- base64画像をデコード
- `src/assets/images/` に保存

## --dry-run オプション

JSONLの生成のみ行い、送信しない:

```bash
bun run images:prompts
# batch-requests.jsonl を確認
cat batch-requests.jsonl | head -1 | jq .
```

## 生成結果の確認

```bash
# 生成された画像を確認
ls -la src/assets/images/

# 画像サイズを確認
file src/assets/images/*.png
```

## エラー対応

### バッチジョブが失敗した場合

1. エラーログを確認
2. 問題のあるプロンプトを特定
3. Illustratorにプロンプト修正を依頼

### 画像品質に問題がある場合

1. 問題のある画像を特定
2. プロンプトの改善点を分析
3. Illustratorに報告し、プロンプト修正を依頼

## 出力

### 生成完了報告

```markdown
# 画像生成完了

## 生成結果

| # | 名前 | サイズ | 状態 |
|---|------|--------|------|
| 1 | chapter01-flow-xxx | 2048x2732 | ✅ 成功 |
| 2 | chapter02-compare-xxx | 2732x2048 | ✅ 成功 |

## ファイル配置

- 出力先: `src/assets/images/`
- 生成数: N 件

## 品質確認

- [ ] 全画像が正常に表示される
- [ ] テキストの歪みがない
- [ ] 意図した内容が描かれている

## 次のステップ

1. 画像品質を目視確認
2. 問題があればIllustratorに報告
3. `bun run build` でビルドに含める
```

## コスト意識

- バッチ処理は個別APIコールより安価
- 不要な再生成を避ける
- プロンプト修正は慎重に（再生成コストが発生）
