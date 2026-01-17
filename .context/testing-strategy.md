# テスト戦略

**最終更新**: 2026年01月17日

## テストピラミッド

```
        ┌─────────┐
        │   E2E   │  10%  クリティカルパス
        ├─────────┤
        │ 統合    │  20%  API・機能統合
        ├─────────┤
        │ユニット │  70%  関数・コンポーネント
        └─────────┘
```

---

## カバレッジ目標

- **ユニットテスト**: 80%以上
- **統合テスト**: すべてのConvex API
- **E2Eテスト**: クリティカルパス

---

## テストフレームワーク

### Vitest（ユニット・統合テスト）
```bash
npm test              # テスト実行
npm run test:coverage # カバレッジ
```

**対象**: Reactコンポーネント、カスタムフック、ユーティリティ関数
**ディレクトリ**: `app/_shared/features/*/__tests__/`

### convex-test（Convexバックエンド）
**対象**: Convex Queries/Mutations/Actions
**ディレクトリ**: `convex/__tests__/`

### Playwright（E2E）
```bash
npm run test:e2e       # E2Eテスト
npm run test:e2e:ui    # UIモード
```

**対象**: ユーザーフロー全体
**ディレクトリ**: `e2e/`

---

## テストパターン

### ユニットテスト

```typescript
// app/_shared/features/group/__tests__/use-group-actions.test.ts
import { renderHook, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"

test("グループを作成できる", async () => {
  const { result } = renderHook(() => useGroupActions())
  await result.current.createGroup("テストグループ")
  await waitFor(() => {
    expect(result.current.groups).toHaveLength(1)
  })
})
```

### 統合テスト

```typescript
// convex/__tests__/groups.test.ts
import { convexTest } from "convex-test"
import { expect, test } from "vitest"

test("グループを作成できる", async () => {
  const t = convexTest(schema)
  await t.run(async (ctx) => {
    const groupId = await ctx.run(api.groups.mutations.create, {
      name: "テストグループ",
    })
    expect(groupId).toBeDefined()
  })
})
```

### E2Eテスト

```typescript
// e2e/invitation/invitation-flow.spec.ts
import { expect, test } from "@playwright/test"

test("招待フロー", async ({ page }) => {
  await page.goto("/login")
  await page.fill('input[name="email"]', "test@example.com")
  await page.click('button[type="submit"]')
  await page.click("text=グループ作成")
  await page.fill('input[name="name"]', "テストグループ")
  await page.click('button[type="submit"]')
  const code = await page.textContent('[data-testid="invite-code"]')
  expect(code).toBeTruthy()
})
```

---

## テストルール

### DO（推奨）

✅ **ユーザー視点でテスト**
```typescript
screen.getByRole("button", { name: "送信" })
```

✅ **テストの独立性を保つ**
```typescript
beforeEach(async () => {
  await setupTestData()
})
```

✅ **明確なテスト名**
```typescript
test("未認証ユーザーはダッシュボードにアクセスできない", ...)
```

### DON'T（非推奨）

❌ **実装詳細に依存しない**
```typescript
// Bad
expect(wrapper.find(".internal-class")).toHaveLength(1)

// Good
expect(screen.getByText("表示テキスト")).toBeInTheDocument()
```

❌ **過度なモック（必要最小限に）**

❌ **テスト間の依存（各テストは独立）**

---

## テストデータ管理

### Fixture
```typescript
// e2e/helpers/fixtures.ts
export const testUser = {
  email: "test@example.com",
  password: "password123",
}
```

### ヘルパー
```typescript
// e2e/helpers/auth.ts
export async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.fill('input[name="email"]', email)
  await page.click('button[type="submit"]')
}
```

---

## CI/CD統合（計画中）

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
      - run: npm run test:e2e
```

---

## テストメトリクス

- **カバレッジ**: 80%以上
- **実行時間**: ユニット<5分、E2E<15分
- **失敗率**: 1%未満

---

## フロントエンドテストの注意点

### Radix UI / shadcn コンポーネントのテスト制限

jsdom環境では以下の制限があります：

| コンポーネント | 問題 | 対策 |
|---------------|------|------|
| **Select** | `hasPointerCapture` エラー、ドロップダウンが開かない | 基本レンダリングのみテスト、または子コンポーネントをモック |
| **Dialog** | ポータル経由でコンテンツが見つからない | `open={true}` で直接表示確認、ポータルを無視 |
| **RadioGroup** | FormLabelが非labellable要素に関連付けられる | `getByText` を使用（`getByLabelText` は避ける） |

### 推奨モックパターン

```typescript
// Convex mutation のモック
const mockMutation = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockMutation,
  useQuery: () => undefined,
}));

// sonner トースト（vi.mockの後にimport）
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
const { toast } = await import("sonner");

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
```

### Result型のモック

```typescript
// 成功
mockMutation.mockResolvedValue({ isSuccess: true, data: { id: "123" } });

// 失敗
mockMutation.mockResolvedValue({ isSuccess: false, errorMessage: "エラー" });

// 例外
mockMutation.mockRejectedValue(new Error("ネットワークエラー"));
```

### maxLength属性のあるフィールド

HTMLの`maxLength`属性はブラウザレベルで入力を制限するため、超過文字数のバリデーションテストは不可。サーバーサイドで確認が必要。

```typescript
// ❌ このテストは動作しない（HTMLが入力を制限）
await user.type(input, "あ".repeat(51)); // maxLength={50}の場合

// ✅ 代替: サーバーサイドバリデーションをテスト
```

---

## 関連ドキュメント

- [プロジェクト概要](project.md)
- [アーキテクチャ](architecture.md)
- [エラーハンドリング](error-handling.md)
