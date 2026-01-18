# ブランチ作成

ブランチ命名規則に従ってブランチを作成します。

## 実行フロー

### 1. 現在のブランチ確認
```bash
git branch --show-current
git status
```

### 2. developブランチの最新化
```bash
git checkout develop
git pull origin develop
```

### 3. ブランチタイプの決定

ユーザーのリクエストから適切なタイプを判断：

| キーワード | タイプ |
|-----------|--------|
| 新機能、追加、実装 | `feature` |
| バグ、修正、エラー | `fix` |
| リファクタ、改善 | `refactor` |
| ドキュメント、仕様書 | `docs` |
| テスト | `test` |
| その他 | `chore` |

### 4. ブランチ名の生成

日本語の説明から英語のkebab-caseに変換：

**変換例**:
- 「処方箋の複製機能」 → `feature/prescription-duplication`
- 「ログインエラーの修正」 → `fix/login-error`
- 「認証ロジックのリファクタ」 → `refactor/auth-logic`

### 5. ブランチ作成
```bash
git checkout -b <type>/<description>
```

### 6. 確認
```bash
git branch --show-current
```

---

## 注意事項

1. **未コミットの変更がある場合**: stashするか確認
2. **既存ブランチとの重複**: ブランチ名の一意性を確認
3. **ブランチ名の長さ**: 50文字以内を推奨
