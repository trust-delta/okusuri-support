---
name: radix-ui-patterns
description: |
  shadcn/ui と Radix UI コンポーネントの実装・テストパターン。UIコンポーネントを作成する際やテストを書く際に参照する。
  <example>
  - 「Dialogコンポーネントの実装方法」
  - 「Selectのテストを書きたい」
  - 「shadcnコンポーネントの追加方法」
  </example>
---

# Radix UI / shadcn Patterns

shadcn/ui と Radix UI コンポーネントの実装・テストパターンガイド。

## 利用可能な機能

### 1. 実装パターン
shadcn/uiコンポーネントの実装ガイド。

**使用例**:
- 「Cardコンポーネントの使い方」
- 「Formの実装パターン」
- 「shadcnコンポーネントを追加」

**詳細**: [capabilities/implementation.md](capabilities/implementation.md)

---

### 2. テストパターン
Radix UIコンポーネントのテストガイド（jsdom制限の回避策含む）。

**使用例**:
- 「Dialogのテストを書きたい」
- 「Selectがテストで動かない」
- 「モックパターンを確認」

**詳細**: [capabilities/testing.md](capabilities/testing.md)

---

## クイックリファレンス

### shadcn コンポーネント追加

```bash
npx shadcn@latest add <component-name>
```

### jsdomで動作しないコンポーネント

| コンポーネント | 問題 | 回避策 |
|---------------|------|--------|
| Select | ポインターキャプチャ | 基本レンダリングのみテスト |
| Dialog | ポータル | `open` prop で直接表示 |
| DropdownMenu | ポータル | モックに置き換え |
| RadioGroup | FormLabel | `getByText` を使用 |

### よく使うモック

```typescript
// Convex
const mockMutation = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockMutation,
  useQuery: () => undefined,
}));

// sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
```

---

## 関連スキル

- **review-assistant**: コードレビュー（アクセシビリティチェック含む）
- **convex-test-guide**: Convexバックエンドのテスト

---

**最終更新**: 2025年11月30日
