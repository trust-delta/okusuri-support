# 実装パターン

shadcn/ui と Radix UI コンポーネントの実装パターンガイド。

## コンポーネント追加

### shadcn CLI を使用

```bash
# コンポーネントを追加
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog

# 複数コンポーネントを一度に追加
npx shadcn@latest add button card dialog form input
```

### 追加後の確認

```bash
# 追加されたファイルを確認
ls components/ui/

# 依存関係を確認
npm ls @radix-ui/react-dialog
```

---

## コンポーネント実装パターン

### Card コンポーネント

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StatsCard({ title, value, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
```

### Dialog コンポーネント

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function CreateItemDialog({ onCreated }: CreateItemDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data: FormData) => {
    await createItem(data);
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アイテムを作成</DialogTitle>
          <DialogDescription>
            新しいアイテムの情報を入力してください
          </DialogDescription>
        </DialogHeader>
        {/* フォーム */}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button type="submit">作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Select コンポーネント

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TimingSelect({ value, onValueChange }: TimingSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="タイミングを選択" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="morning">朝</SelectItem>
        <SelectItem value="noon">昼</SelectItem>
        <SelectItem value="evening">晩</SelectItem>
        <SelectItem value="bedtime">就寝前</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Form コンポーネント（react-hook-form + zod）

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(50, "50文字以内"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function CreateForm({ onSubmit }: CreateFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input placeholder="名前を入力" {...field} />
              </FormControl>
              <FormDescription>
                50文字以内で入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "送信中..." : "送信"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## スタイリングパターン

### Tailwind CSS との組み合わせ

```tsx
// variants を使ったカスタマイズ
<Button variant="outline" size="sm" className="w-full">
  送信
</Button>

// カスタムクラスの追加
<Card className="hover:shadow-lg transition-shadow">
  {/* ... */}
</Card>
```

### ダークモード対応

```tsx
// Tailwind の dark: プレフィックスを使用
<div className="bg-gray-50 dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">
    テキスト
  </p>
</div>
```

---

## アクセシビリティの実装

### ARIA 属性の追加

```tsx
// プログレスバー
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="進捗状況"
  className="h-2 bg-gray-200 rounded-full"
>
  <div
    className="h-full bg-blue-500 rounded-full"
    style={{ width: `${progress}%` }}
  />
</div>

// 装飾的アイコン
<span aria-hidden="true">
  <Icon />
</span>

// 意味のあるアイコン
<button aria-label="削除">
  <TrashIcon />
</button>
```

### キーボードナビゲーション

```tsx
// カスタムクリック可能要素
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }}
>
  クリック
</div>
```

---

## ローディング状態

### Skeleton コンポーネント

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

// 使用例
function DataCard({ data }: DataCardProps) {
  if (data === undefined) {
    return <CardSkeleton />;
  }

  return (
    <Card>
      {/* 実際のコンテンツ */}
    </Card>
  );
}
```

---

## エラー状態

### トーストによるフィードバック

```tsx
import { toast } from "sonner";

async function handleSubmit(data: FormData) {
  try {
    await saveData(data);
    toast.success("保存しました");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "保存に失敗しました"
    );
  }
}
```

### フォームエラー

```tsx
// FormMessage コンポーネントで自動表示
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>メールアドレス</FormLabel>
      <FormControl>
        <Input type="email" {...field} />
      </FormControl>
      <FormMessage /> {/* エラー時に自動表示 */}
    </FormItem>
  )}
/>
```

---

## チェックリスト

### 実装前の確認

- [ ] 必要なコンポーネントが追加済み（shadcn CLI）
- [ ] 依存関係が正しくインストール済み
- [ ] プロジェクトのスタイルガイドを確認

### 実装時の確認

- [ ] アクセシビリティ属性の追加（ARIA、alt等）
- [ ] ダークモード対応
- [ ] ローディング状態の実装（Skeleton）
- [ ] エラー状態の実装（トースト、FormMessage）
- [ ] キーボード操作の確認

### 実装後の確認

- [ ] 型チェックがパス
- [ ] Lintがパス
- [ ] レスポンシブデザインの確認

---

**最終更新**: 2025年11月30日
