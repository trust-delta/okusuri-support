# Worktree作成

機能ブランチとworktreeを同時に作成し、新しいWezTermタブでClaude Codeを起動します。

## ユースケース

- developでClaude設定調整中に、別の機能開発を始めたい
- 現在の作業を中断せずに、別のコンテキストで作業したい
- 複数の機能を並行して開発したい

## 実行方法

### スクリプト実行

```bash
./.claude/skills/git-workflow/scripts/new-feature-worktree.sh <branch-name>
```

**例**:
```bash
./.claude/skills/git-workflow/scripts/new-feature-worktree.sh feature/add-notification
```

### 動作

1. 親ディレクトリにworktree作成（例: `../okusuri-support-feature-add-notification`）
2. 指定したブランチを作成（または既存ブランチを使用）
3. WezTermの新しいタブでworktreeディレクトリに移動
4. 新しいタブでClaude Codeを自動起動

### 結果

```
/home/user/works/okusuri-support                          # develop - 元の作業継続
/home/user/works/okusuri-support-feature-add-notification # feature - 新しいタブで作業
```

---

## worktree管理

### 一覧表示
```bash
git worktree list
```

### 削除
```bash
git worktree remove ../okusuri-support-feature-add-notification
```

### 強制削除（未コミットの変更があっても削除）
```bash
git worktree remove --force ../okusuri-support-feature-add-notification
```

---

## 注意事項

1. **同じブランチの二重チェックアウト不可**: 1つのブランチは1つのworktreeでのみ使用可能
2. **worktree間のClaude設定**: `.claude/`は各worktreeで別々に管理される
3. **マージ後の削除**: 機能完了後はworktreeも削除すること
4. **WezTerm必須**: このスクリプトはWezTermの`wezterm cli spawn`に依存
