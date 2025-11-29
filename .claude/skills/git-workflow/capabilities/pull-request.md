# PR作成

PRテンプレートに従ってPull Requestを作成します。

## 実行フロー

### 1. 現在の状態確認
```bash
git status
git log main..HEAD --oneline
git diff main...HEAD --stat
```

### 2. リモートへのプッシュ
```bash
git push -u origin $(git branch --show-current)
```

### 3. PR内容の整理

#### 変更内容の分析
- コミット履歴を確認
- 変更ファイルを確認
- 影響範囲を特定

#### PRタイトルの決定
```
<type>: <簡潔な説明>
```

### 4. PR作成

```bash
gh pr create --title "<type>: <説明>" --body "$(cat <<'EOF'
## Summary
<変更内容の概要を1-3行で>

## Changes
- <変更点1>
- <変更点2>
- <変更点3>

## Test plan
- [ ] <テスト項目1>
- [ ] <テスト項目2>

## Related
- 仕様書: `.context/specs/features/<name>.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5. 確認
```bash
gh pr view --web
```

---

## PRテンプレート詳細

### Summary
変更の概要を1-3行で簡潔に説明。
- 何を変更したか
- なぜ変更したか

### Changes
箇条書きで主要な変更点を列挙：
- 新規ファイル/コンポーネント
- 修正した機能
- 削除した機能

### Test plan
テスト項目をチェックリスト形式で：
- [ ] 単体テストが通る
- [ ] E2Eテストが通る
- [ ] 手動テストで動作確認
- [ ] エッジケースの確認

### Related
関連するリソースへのリンク：
- Issue番号（`#123`形式）
- 仕様書へのパス
- 関連するPR

---

## PRタイプ別の例

### 新機能
```
feat: 処方箋の複製機能を追加

## Summary
既存の処方箋をコピーして新しい処方箋を作成できる機能を追加しました。

## Changes
- `convex/prescription/mutations.ts` に `duplicate` mutationを追加
- `src/features/prescription/components/PrescriptionActions.tsx` に複製ボタンを追加
- 複製時のデータ変換ロジックを実装

## Test plan
- [ ] 処方箋一覧から複製ボタンをクリックできる
- [ ] 複製後の処方箋が正しく作成される
- [ ] 元の処方箋は変更されない

## Related
- 仕様書: `.context/specs/features/prescription.md`
```

### バグ修正
```
fix: ログイン時の認証エラーを修正

## Summary
セッショントークンの有効期限チェックが正しく動作していなかった問題を修正しました。

## Changes
- `src/features/auth/lib/session.ts` の有効期限チェックロジックを修正
- エラーハンドリングを改善

## Test plan
- [ ] 正常なログインが動作する
- [ ] 期限切れトークンで適切にエラーが表示される
- [ ] ログアウト後に再ログインできる

## Related
- Issue: #42
```

---

## 注意事項

1. **ベースブランチ**: 通常は `main`
2. **レビュワー**: 必要に応じて指定
3. **ラベル**: 適切なラベルを付与
4. **ドラフト**: WIPの場合は `--draft` オプション
