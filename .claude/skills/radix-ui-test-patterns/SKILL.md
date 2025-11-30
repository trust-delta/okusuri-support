---
name: radix-ui-test-patterns
description: Radix UI/shadcn コンポーネントのテストパターン。jsdomの制限と回避策、推奨モックパターンを提供する。
---

# Radix UI / shadcn Test Patterns

Radix UIとshadcn/uiコンポーネントのテストパターンガイド。

## jsdomの制限

jsdom環境ではRadix UIの一部機能が正しく動作しません。

| コンポーネント | 問題 | エラー例 |
|---------------|------|---------|
| **Select** | ポインターキャプチャ未実装 | `TypeError: target.hasPointerCapture is not a function` |
| **Dialog** | ポータルが正しく動作しない | コンテンツが見つからない |
| **DropdownMenu** | 同上 | メニューが開かない |
| **RadioGroup** | FormLabelが非labellable要素に関連付け | `getByLabelText` が失敗 |
| **Tooltip** | ホバー状態の管理 | ツールチップが表示されない |

---

## コンポーネント別テストパターン

### Select

```typescript
// ❌ 避ける: ドロップダウンを開くテスト
it("グループを選択できる", async () => {
  const user = userEvent.setup();
  render(<GroupSelect groups={groups} />);

  await user.click(screen.getByRole("combobox")); // エラー発生
  await user.click(screen.getByText("グループ2")); // 見つからない
});

// ✅ 推奨: 基本レンダリングのみテスト
it("現在の選択値が表示される", () => {
  render(<GroupSelect groups={groups} value="group-1" />);

  expect(screen.getByRole("combobox")).toBeInTheDocument();
  expect(screen.getByText("グループ1")).toBeInTheDocument();
});

// ✅ 推奨: コールバックは直接呼び出し
it("onValueChangeが呼ばれる", () => {
  const onChange = vi.fn();
  // コンポーネントの内部実装をテストするのではなく
  // 親コンポーネントとの統合をテスト
});
```

### Dialog

```typescript
// ✅ open propで直接表示テスト
it("開いた状態でコンテンツが表示される", () => {
  render(<CreateGroupDialog open={true} onOpenChange={vi.fn()} />);

  expect(screen.getByText("新しいグループを作成")).toBeInTheDocument();
});

it("閉じた状態ではコンテンツが表示されない", () => {
  render(<CreateGroupDialog open={false} onOpenChange={vi.fn()} />);

  expect(screen.queryByText("新しいグループを作成")).not.toBeInTheDocument();
});

// ✅ フォーム内のテスト（Dialog内）
it("フォーム送信でonOpenChange(false)が呼ばれる", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  mockMutation.mockResolvedValue({ isSuccess: true });

  render(<CreateGroupDialog open={true} onOpenChange={onOpenChange} />);

  await user.type(screen.getByPlaceholderText("グループ名"), "テスト");
  await user.click(screen.getByRole("button", { name: "作成" }));

  await waitFor(() => {
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

### RadioGroup

```typescript
// ❌ 避ける: getByLabelText（FormLabel経由）
it("役割を選択できる", () => {
  render(<RoleSelector />);
  expect(screen.getByLabelText("患者")).toBeInTheDocument(); // 失敗する可能性
});

// ✅ 推奨: getByText
it("役割オプションが表示される", () => {
  render(<RoleSelector />);
  expect(screen.getByText("患者")).toBeInTheDocument();
  expect(screen.getByText("サポーター")).toBeInTheDocument();
});

// ✅ ラジオボタン自体のテスト
it("役割を選択できる", async () => {
  const user = userEvent.setup();
  render(<RoleSelector defaultValue="supporter" />);

  // ラジオボタンを直接取得
  const patientRadio = screen.getByRole("radio", { name: /患者/ });
  await user.click(patientRadio);

  expect(patientRadio).toBeChecked();
});
```

---

## 推奨モックパターン

### 子コンポーネントのモック

複雑なRadixコンポーネントはモックに置き換え：

```typescript
// CreateGroupDialogをモック
vi.mock("./create-group-dialog", () => ({
  CreateGroupDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="create-group-dialog">
        <button onClick={() => onOpenChange(false)}>閉じる</button>
      </div>
    ) : null,
}));

// テストで使用
it("ダイアログを開閉できる", async () => {
  const user = userEvent.setup();
  render(<GroupSwitcher />);

  await user.click(screen.getByTitle("新規作成"));
  expect(screen.getByTestId("create-group-dialog")).toBeInTheDocument();

  await user.click(screen.getByText("閉じる"));
  expect(screen.queryByTestId("create-group-dialog")).not.toBeInTheDocument();
});
```

### Convex + sonner のモック

```typescript
// Convex mutation
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

// テストで使用
it("成功時にトーストが表示される", async () => {
  mockMutation.mockResolvedValue({ isSuccess: true });

  // ... テスト実行

  expect(toast.success).toHaveBeenCalledWith("作成しました！");
});
```

### next/navigation のモック

```typescript
const mockPush = vi.fn();
const mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));
```

---

## フォームバリデーションのテスト

### react-hook-form + zod

```typescript
it("必須フィールドのバリデーション", async () => {
  const user = userEvent.setup();
  render(<CreateGroupForm />);

  // 空のまま送信
  await user.click(screen.getByRole("button", { name: "作成" }));

  await waitFor(() => {
    expect(screen.getByText("グループ名を入力してください")).toBeInTheDocument();
  });
});

it("文字数制限のバリデーション", async () => {
  const user = userEvent.setup();
  render(<CreateGroupForm />);

  // 51文字入力（maxLength属性がない場合のみ有効）
  await user.type(screen.getByLabelText("グループ名"), "あ".repeat(51));
  await user.click(screen.getByRole("button", { name: "作成" }));

  await waitFor(() => {
    expect(screen.getByText("50文字以内で入力してください")).toBeInTheDocument();
  });
});
```

### maxLength属性がある場合

HTMLの`maxLength`属性はブラウザレベルで入力を制限するため、超過テストは不可：

```typescript
// ❌ このテストは動作しない
await user.type(input, "あ".repeat(51)); // maxLength={50}で切り捨てられる

// ✅ 代替案: サーバーサイドバリデーションをテスト
// または: maxLength属性を削除してzodのみでバリデーション
```

---

## 送信状態のテスト

```typescript
it("送信中は「作成中...」が表示される", async () => {
  const user = userEvent.setup();
  mockMutation.mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve({ isSuccess: true }), 100))
  );

  render(<CreateGroupForm />);

  await user.type(screen.getByLabelText("グループ名"), "テスト");
  await user.click(screen.getByRole("button", { name: "作成" }));

  // 即座に「作成中...」が表示される
  expect(screen.getByText("作成中...")).toBeInTheDocument();
});
```

---

## チェックリスト

### テスト前の確認

- [ ] jsdomで動作しないRadixコンポーネントを把握
- [ ] 必要に応じて子コンポーネントをモック
- [ ] `getByLabelText` ではなく `getByText` を使用（FormLabel問題）

### テスト項目

- [ ] 基本レンダリング
- [ ] フォームバリデーション（必須、文字数）
- [ ] API成功時の処理（トースト、遷移）
- [ ] API失敗時のエラーハンドリング
- [ ] 送信中の状態表示
