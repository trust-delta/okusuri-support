# Feature-Based アーキテクチャへのリファクタリング設計書

**作成日**: 2025年10月12日 14:36 JST  
**ステータス**: 設計完了 / 実装準備中

---

## 📋 目次

1. [概要](#概要)
2. [現状の課題](#現状の課題)
3. [設計思想](#設計思想)
4. [ディレクトリ構造](#ディレクトリ構造)
5. [詳細設計](#詳細設計)
6. [実装ステップ](#実装ステップ)
7. [期待される効果](#期待される効果)

---

## 概要

コードベースを機能ごとに整理し、保守性・拡張性・テスタビリティを向上させるためのリファクタリング計画。

### リファクタリングの目的

- **コードの重複削減**: 約480-550行の重複コードを削減
- **機能の独立性向上**: 各featureが独立してテスト・変更可能に
- **検索性の向上**: 機能名でディレクトリを直接探せる
- **オンボーディング改善**: 新メンバーが全体構造を把握しやすく

---

## 現状の課題

### 1. フォームページの重複構造

- 認証関連ページ（login, onboarding, invite）で同じレイアウトパターンが繰り返されている
- `min-h-screen flex items-center justify-center` が6箇所以上で重複

**影響ファイル**:
- `src/app/login/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/invite/[code]/page.tsx`
- `src/app/dashboard/page.tsx`

### 2. OAuth ボタンの SVG インライン化

GitHub/Google の SVG アイコンが `login/page.tsx:29-87` にハードコード。

### 3. 認証フロー管理の複雑化

`PasswordSignIn` と `PasswordReset` で類似の状態管理とエラーハンドリングが重複。

### 4. コンポーネントの分散

関連するコンポーネントが `src/components/` 直下にフラットに配置され、機能ごとの関連性が不明瞭。

---

## 設計思想

### Feature-Based アーキテクチャ

各機能（feature）ごとに以下を一箇所に集約:

- **コンポーネント** (UI)
- **カスタムフック** (ロジック)
- **型定義** (types)
- **定数** (constants)
- **ユーティリティ** (utils)

### メリット

| 項目 | 詳細 |
|------|------|
| **凝集度** | 関連するコードが一箇所に集まり、変更が容易 |
| **独立性** | 各featureが独立し、並行開発がしやすい |
| **テスト** | feature単位でテストを書きやすい |
| **検索** | 機能名から直感的にファイルを探せる |
| **削除** | 不要な機能をディレクトリごと削除可能 |

---

## ディレクトリ構造

```
src/
├── features/                           # 機能ごとのモジュール
│   ├── auth/                           # 認証機能
│   │   ├── components/
│   │   │   ├── oauth-button.tsx        # OAuth ログインボタン
│   │   │   ├── password-sign-in.tsx    # パスワードログイン
│   │   │   ├── password-reset.tsx      # パスワードリセット
│   │   │   ├── auth-page-layout.tsx    # 認証ページ共通レイアウト
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-auth-form.ts        # 認証フォーム共通ロジック
│   │   │   ├── use-otp-verification.ts # OTP検証ロジック
│   │   │   ├── use-redirect-after-auth.ts # 認証後リダイレクト
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── group/                          # グループ機能
│   │   ├── components/
│   │   │   ├── group-members-list.tsx
│   │   │   ├── group-invitation-manager.tsx
│   │   │   ├── invitation-code-input.tsx
│   │   │   ├── group-form.tsx
│   │   │   ├── member-card.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-group-members.ts
│   │   │   ├── use-invitation.ts
│   │   │   ├── use-group-status.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── medication/                     # 服薬管理機能
│   │   ├── components/
│   │   │   ├── medication-recorder.tsx
│   │   │   ├── timing-selector.tsx
│   │   │   ├── record-status-badge.tsx
│   │   │   ├── record-history-list.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-medication-records.ts
│   │   │   ├── use-today-records.ts
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   └── timings.ts              # タイミング定数
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── onboarding/                     # オンボーディング機能
│   │   ├── components/
│   │   │   ├── onboarding-layout.tsx
│   │   │   ├── mode-selection.tsx
│   │   │   ├── group-creation-form.tsx
│   │   │   ├── join-with-code-form.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-onboarding-flow.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── dashboard/                      # ダッシュボード機能
│       ├── components/
│       │   ├── dashboard-header.tsx
│       │   ├── user-greeting.tsx
│       │   ├── group-info-card.tsx
│       │   └── index.ts
│       ├── hooks/
│       │   └── use-dashboard-data.ts
│       └── index.ts
│
├── components/                         # 共通UIコンポーネント
│   ├── ui/                             # shadcn/ui
│   │   ├── button.tsx
│   │   ├── form.tsx
│   │   └── ...
│   ├── layouts/                        # 共通レイアウト
│   │   ├── page-layout.tsx
│   │   ├── centered-container.tsx
│   │   └── index.ts
│   └── common/                         # 汎用コンポーネント
│       ├── loading-spinner.tsx
│       ├── error-message.tsx
│       ├── divider.tsx
│       └── index.ts
│
├── hooks/                              # 共通フック
│   ├── use-current-user.ts
│   ├── use-clipboard.ts
│   └── index.ts
│
├── lib/                                # ユーティリティ
│   ├── utils.ts
│   ├── date-fns.ts
│   └── ...
│
├── types/                              # グローバル型定義
│   ├── convex.types.ts
│   └── common.types.ts
│
└── app/                                # Next.js App Router
    ├── (auth)/                         # 認証関連ルート
    │   ├── login/
    │   │   └── page.tsx
    │   └── layout.tsx
    ├── (authenticated)/                # 認証必須ルート
    │   ├── dashboard/
    │   ├── onboarding/
    │   ├── invite/
    │   └── layout.tsx
    ├── page.tsx
    └── layout.tsx
```

---

## 詳細設計

### 1. 認証機能 (`features/auth/`)

#### 1.1 `auth-page-layout.tsx`

**目的**: 認証・オンボーディング系ページの共通レイアウト

```tsx
interface AuthPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showBackLink?: boolean;
  backLinkHref?: string;
  backLinkText?: string;
}

export function AuthPageLayout({
  title,
  description,
  children,
  showBackLink = false,
  backLinkHref = "/",
  backLinkText = "← トップページに戻る"
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        {children}
        
        {showBackLink && (
          <div className="mt-6 text-center">
            <a
              href={backLinkHref}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
            >
              {backLinkText}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

**使用箇所**:
- `src/app/login/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/invite/[code]/page.tsx`

**削減効果**: 約150行

---

#### 1.2 `oauth-button.tsx`

**目的**: GitHub/Google ログインボタンの共通化

```tsx
type OAuthProvider = 'github' | 'google';

interface OAuthButtonProps {
  provider: OAuthProvider;
  redirectTo?: string;
  className?: string;
}

const PROVIDER_CONFIG = {
  github: {
    label: 'GitHubでログイン',
    icon: <GitHubIcon />,
  },
  google: {
    label: 'Googleでログイン',
    icon: <GoogleIcon />,
  },
} as const;

export function OAuthButton({ 
  provider, 
  redirectTo = '/dashboard',
  className 
}: OAuthButtonProps) {
  const { signIn } = useAuthActions();
  const config = PROVIDER_CONFIG[provider];
  
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void signIn(provider, { redirectTo })}
      className={cn("w-full gap-3", className)}
    >
      {config.icon}
      {config.label}
    </Button>
  );
}
```

**削減効果**: 約60行

---

#### 1.3 `use-redirect-after-auth.ts`

**目的**: 認証後のリダイレクトロジックを一元化

```tsx
export function useRedirectAfterAuth() {
  const router = useRouter();
  const groupStatus = useQuery(api.groups.getUserGroupStatus);

  useEffect(() => {
    if (groupStatus === undefined) return; // Loading
    
    if (groupStatus === null) {
      router.push("/login");
      return;
    }
    
    if (!groupStatus.hasGroup) {
      router.push("/onboarding");
    }
  }, [groupStatus, router]);

  return { 
    isLoading: groupStatus === undefined, 
    groupStatus 
  };
}
```

**使用箇所**: `src/app/dashboard/page.tsx`

**削減効果**: 約30行

---

### 2. グループ機能 (`features/group/`)

#### 2.1 `use-group-members.ts`

**目的**: メンバー取得とソートロジックの共通化

```tsx
export function useGroupMembers(groupId: Id<"groups">) {
  const members = useQuery(api.groups.getGroupMembers, { groupId });
  
  const sortedMembers = useMemo(() => {
    if (!members) return [];
    
    return [...members].sort((a, b) => {
      // 患者を先頭に
      if (a.role === "patient" && b.role !== "patient") return -1;
      if (a.role !== "patient" && b.role === "patient") return 1;
      // 同じロールなら参加日時順
      return a.joinedAt - b.joinedAt;
    });
  }, [members]);
  
  return { 
    members: sortedMembers, 
    isLoading: members === undefined 
  };
}
```

**使用箇所**: `group-members-list.tsx`

**削減効果**: 約20行

---

#### 2.2 `member-card.tsx`

**目的**: メンバー表示UIの再利用

```tsx
interface MemberCardProps {
  member: {
    userId: string;
    displayName: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: 'patient' | 'supporter';
    joinedAt: number;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const joinDate = new Date(member.joinedAt);
  const isPatient = member.role === "patient";
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage
          src={member.image || undefined}
          alt={member.name || member.displayName || "プロフィール画像"}
        />
        <AvatarFallback>
          {member.name?.charAt(0) ||
            member.displayName?.charAt(0) ||
            member.email?.charAt(0) ||
            "?"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {member.displayName}
          </p>
          {isPatient ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              患者
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              サポーター
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          参加日: {joinDate.toLocaleDateString("ja-JP")}
        </p>
      </div>
    </div>
  );
}
```

**削減効果**: 約30行

---

### 3. 服薬管理機能 (`features/medication/`)

#### 3.1 `constants/timings.ts`

**目的**: タイミング定数の一元管理

```tsx
export const MEDICATION_TIMINGS = [
  { value: "morning" as const, label: "朝" },
  { value: "noon" as const, label: "昼" },
  { value: "evening" as const, label: "晩" },
  { value: "bedtime" as const, label: "就寝前" },
  { value: "asNeeded" as const, label: "頓服" },
] as const;

export type MedicationTiming = typeof MEDICATION_TIMINGS[number]['value'];
```

**使用箇所**: `medication-recorder.tsx`, 将来的な他の服薬関連コンポーネント

---

#### 3.2 `use-medication-records.ts`

**目的**: 服薬記録のCRUD操作を集約

```tsx
export function useMedicationRecords(groupId: Id<"groups">, date: string) {
  const [isLoading, setIsLoading] = useState(false);
  
  const records = useQuery(api.medicationRecords.getTodayRecords, {
    groupId,
    scheduledDate: date,
  });
  
  const recordMutation = useMutation(api.medicationRecords.recordSimpleMedication);
  const deleteMutation = useMutation(api.medicationRecords.deleteMedicationRecord);
  
  const record = useCallback(async (
    timing: MedicationTiming,
    status: "taken" | "skipped"
  ) => {
    setIsLoading(true);
    try {
      await recordMutation({
        groupId,
        timing,
        scheduledDate: date,
        simpleMedicineName: MEDICATION_TIMINGS.find((t) => t.value === timing)?.label,
        status,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "記録に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId, date, recordMutation]);
  
  const deleteRecord = useCallback(async (recordId: Id<"medicationRecords">) => {
    setIsLoading(true);
    try {
      await deleteMutation({ recordId });
      toast.success("記録を取り消しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "取消しに失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, [deleteMutation]);
  
  const getRecordByTiming = useCallback((timing: MedicationTiming) => {
    if (!records) return null;
    return records.find(
      (r) => r.timing === timing && r.scheduledDate === date
    );
  }, [records, date]);
  
  return { 
    records, 
    record, 
    deleteRecord, 
    getRecordByTiming,
    isLoading 
  };
}
```

**削減効果**: 約80行

---

### 4. 共通コンポーネント (`components/common/`)

#### 4.1 `divider.tsx`

**目的**: "または" などの区切り線の共通化

```tsx
interface DividerProps {
  text?: string;
  className?: string;
}

export function Divider({ text = "または", className }: DividerProps) {
  return (
    <div className={cn("relative my-6", className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300 dark:border-gray-600" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          {text}
        </span>
      </div>
    </div>
  );
}
```

**使用箇所**: `login/page.tsx`

---

#### 4.2 `loading-spinner.tsx`

**目的**: ローディング表示の統一

```tsx
interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ 
  message = "読み込み中...", 
  className 
}: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center gap-4",
      className
    )}>
      <Spinner className="size-8" />
      <div className="text-lg text-gray-600 dark:text-gray-400">
        {message}
      </div>
    </div>
  );
}
```

**使用箇所**: `dashboard/page.tsx`, `invite/[code]/page.tsx`

---

## 実装ステップ

### Phase 1: 共通レイアウトとフック (優先度: 高)

**目標**: 最も使用頻度が高い共通部品を作成

#### ステップ
1. ディレクトリ構造を作成
   ```bash
   mkdir -p src/features/auth/{components,hooks,types}
   mkdir -p src/components/{common,layouts}
   ```

2. `components/common/divider.tsx` を作成

3. `components/common/loading-spinner.tsx` を作成

4. `features/auth/components/auth-page-layout.tsx` を作成

5. `features/auth/hooks/use-redirect-after-auth.ts` を作成

6. 各ファイルの `index.ts` でエクスポート設定

**検証方法**:
- 各コンポーネントを Storybook で確認（オプション）
- 型エラーがないことを確認: `npm run type-check`

**削減効果**: 約150行

---

### Phase 2: 認証機能の統合 (優先度: 高)

**目標**: login ページをリファクタリングし、効果を確認

#### ステップ
1. `features/auth/components/oauth-button.tsx` を作成
   - GitHub/Google の SVG アイコンを含める

2. 既存の認証コンポーネントを移動
   ```bash
   mv src/components/password-sign-in.tsx src/features/auth/components/
   mv src/components/password-reset.tsx src/features/auth/components/
   ```

3. `features/auth/index.ts` でエクスポート

4. `app/login/page.tsx` をリファクタリング
   - `AuthPageLayout` を使用
   - `OAuthButton` を使用
   - `Divider` を使用

5. 動作確認
   - ログイン機能が正常に動作するか
   - OAuth ログインが機能するか
   - パスワードログインが機能するか

**検証方法**:
- `npm run dev` で起動
- `/login` にアクセスし、すべてのログイン方法をテスト

**削減効果**: 約100行

---

### Phase 3: グループ機能の整理 (優先度: 中)

**目標**: グループ関連コンポーネントを整理

#### ステップ
1. ディレクトリ構造を作成
   ```bash
   mkdir -p src/features/group/{components,hooks,types}
   ```

2. 既存コンポーネントを移動
   ```bash
   mv src/components/group-members-list.tsx src/features/group/components/
   mv src/components/group-invitation-manager.tsx src/features/group/components/
   ```

3. `features/group/hooks/use-group-members.ts` を作成

4. `features/group/components/member-card.tsx` を抽出
   - `group-members-list.tsx` からメンバー表示部分を分離

5. `group-members-list.tsx` を `use-group-members` フックと `MemberCard` を使うようリファクタリング

6. `features/group/index.ts` でエクスポート

7. 動作確認
   - ダッシュボードでメンバーリストが正常に表示されるか
   - 招待機能が正常に動作するか

**削減効果**: 約50行

---

### Phase 4: 服薬管理機能の整理 (優先度: 中)

**目標**: 服薬管理コンポーネントを整理

#### ステップ
1. ディレクトリ構造を作成
   ```bash
   mkdir -p src/features/medication/{components,hooks,constants,types}
   ```

2. `features/medication/constants/timings.ts` を作成
   - MEDICATION_TIMINGS 定数を定義

3. 既存コンポーネントを移動
   ```bash
   mv src/components/medication-recorder.tsx src/features/medication/components/
   ```

4. `features/medication/hooks/use-medication-records.ts` を作成

5. `medication-recorder.tsx` をフックを使うようリファクタリング
   - `use-medication-records` フックを使用
   - `MEDICATION_TIMINGS` を import

6. `features/medication/index.ts` でエクスポート

7. 動作確認
   - ダッシュボードで服薬記録が正常に動作するか
   - 記録・削除機能が正常に動作するか

**削減効果**: 約80行

---

### Phase 5: オンボーディングの分割 (優先度: 低)

**目標**: オンボーディングページを複数コンポーネントに分割

#### ステップ
1. ディレクトリ構造を作成
   ```bash
   mkdir -p src/features/onboarding/{components,hooks}
   ```

2. `features/onboarding/hooks/use-onboarding-flow.ts` を作成

3. オンボーディングのコンポーネントを分割
   - `mode-selection.tsx`: モード選択画面
   - `group-creation-form.tsx`: グループ作成フォーム
   - `join-with-code-form.tsx`: コード参加フォーム

4. `app/onboarding/page.tsx` をリファクタリング
   - 各コンポーネントを使用
   - `use-onboarding-flow` フックを使用

5. 動作確認
   - オンボーディングフローが正常に動作するか
   - グループ作成が正常に動作するか
   - コード参加が正常に動作するか

**削減効果**: 約100行

---

### Phase 6: ダッシュボードの整理 (オプション)

**目標**: ダッシュボードをコンポーネント分割

#### ステップ
1. ディレクトリ構造を作成
   ```bash
   mkdir -p src/features/dashboard/{components,hooks}
   ```

2. ダッシュボードのコンポーネントを分割
   - `dashboard-header.tsx`: ヘッダー部分
   - `user-greeting.tsx`: ユーザー挨拶
   - `group-info-card.tsx`: グループ情報カード

3. `app/dashboard/page.tsx` をリファクタリング

4. 動作確認

**削減効果**: 約50行

---

## 期待される効果

### 定量的効果

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| コード行数 | ~800行 | ~320-370行 | **-430-480行 (約60%削減)** |
| 平均ファイルサイズ | 150行 | 50-80行 | **約50%削減** |
| コンポーネント数 | 6ファイル | ~30ファイル | 適切な粒度 |
| テストカバレッジ | - | 向上 | feature単位でテスト容易 |

### 定性的効果

| 項目 | 効果 |
|------|------|
| **保守性** | 変更箇所が1箇所に集約され、バグ修正が容易 |
| **可読性** | 機能ごとに整理され、コードの意図が明確 |
| **拡張性** | 新機能追加時に既存コードへの影響を最小化 |
| **テスタビリティ** | 各feature が独立し、ユニットテストが書きやすい |
| **オンボーディング** | 新メンバーが features/ を見れば全体構造を把握 |
| **並行開発** | feature単位で複数人が同時に作業可能 |

---

## リスクと対策

### リスク 1: Import パスの変更による影響

**リスク**: 既存のimportパスが変わり、エラーが発生する可能性

**対策**:
- Phase ごとに段階的に実装
- 各 Phase 完了後に必ず動作確認
- TypeScript の型チェックを活用
- `npm run type-check` を実行して型エラーを検出

### リスク 2: テストの追加工数

**リスク**: リファクタリング後にテストを書く工数が増加

**対策**:
- 既存の動作を保証することを最優先
- テストは段階的に追加
- E2E テストで主要フローをカバー

### リスク 3: チーム内での混乱

**リスク**: 新しいディレクトリ構造に慣れるまで時間がかかる

**対策**:
- このドキュメントを共有
- 新しい構造のメリットを説明
- サンプルコードを提供

---

## 移行ガイドライン

### 新しいコンポーネントを作成する場合

1. **機能を特定**: 認証、グループ、服薬管理などの機能を特定
2. **配置場所を決定**: `src/features/{機能名}/components/` に配置
3. **フックが必要か判断**: ロジックが複雑な場合は `hooks/` に分離
4. **エクスポート**: `index.ts` でエクスポート

### 既存のコンポーネントを修正する場合

1. **機能を確認**: どの feature に属するかを確認
2. **適切なディレクトリに移動**: `src/features/{機能名}/` に移動
3. **import パスを更新**: 他のファイルでの import パスを更新
4. **動作確認**: 修正後に動作確認

---

## 参考資料

### Feature-Based アーキテクチャについて

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Domain-Driven File Structure](https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/)

### Next.js App Router のベストプラクティス

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)

---

## 更新履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-10-12 | 初版作成 | Claude |

---

## 承認

- [ ] 技術リード承認
- [ ] チームレビュー完了
- [ ] 実装開始承認

---

## 実装進捗

### ✅ Phase 1: 共通レイアウトとフック（完了）

**実施日**: 2025年10月12日 14:36-14:43 JST

**作成したファイル**:
- ✅ `src/features/auth/components/auth-page-layout.tsx` - 認証ページ共通レイアウト
- ✅ `src/features/auth/hooks/use-redirect-after-auth.ts` - 認証後リダイレクト管理
- ✅ `src/components/common/divider.tsx` - 区切り線コンポーネント
- ✅ `src/components/common/loading-spinner.tsx` - ローディング表示
- ✅ 各ディレクトリの `index.ts` でエクスポート設定

**検証結果**:
- 型チェック: ✅ 通過
- Lint: ✅ 通過

**効果**:
- 基盤となる共通コンポーネントを整備
- 約150行の重複コード削減の準備完了

---

### ✅ Phase 2: 認証機能の統合（完了）

**実施日**: 2025年10月12日 14:43-14:54 JST

**作成したファイル**:
- ✅ `src/features/auth/components/oauth-button.tsx` - OAuth ログインボタン（GitHub/Google）

**移動したファイル**:
- ✅ `src/components/password-sign-in.tsx` → `src/features/auth/components/`
- ✅ `src/components/password-reset.tsx` → `src/features/auth/components/`

**リファクタリングしたファイル**:
- ✅ `src/app/login/page.tsx`
  - **Before**: 163行
  - **After**: 63行
  - **削減**: 100行（61%削減）

**検証結果**:
- 型チェック: ✅ 通過
- Lint: ✅ 通過
- フォーマット: ✅ 自動修正完了

**効果**:
- login ページが大幅に簡潔化
- OAuth ボタンの SVG が再利用可能なコンポーネントに
- 認証関連コードが `features/auth/` に集約

**コード比較**:
```tsx
// Before: 163行（複雑な構造、インライン SVG）
export default function LoginPage() {
  const { signIn } = useAuthActions();
  // 大量の JSX とインライン SVG...
}

// After: 63行（シンプル、再利用可能）
export default function LoginPage() {
  const [mode, setMode] = useState<"oauth" | "password" | "reset">("oauth");
  
  return (
    <AuthPageLayout title="ログイン" description="..." showBackLink>
      <OAuthButton provider="github" />
      <OAuthButton provider="google" />
      <Divider />
      {/* ... */}
    </AuthPageLayout>
  );
}
```

---

### ✅ Phase 3: グループ機能の整理（完了）

**実施日**: 2025年10月12日 15:15-15:20 JST

**ディレクトリ構造作成**:
- ✅ `src/features/group/{components,hooks,types}` を作成

**移動したファイル**:
- ✅ `src/components/group-members-list.tsx` → `src/features/group/components/`
- ✅ `src/components/group-invitation-manager.tsx` → `src/features/group/components/`

**作成したファイル**:
- ✅ `src/features/group/hooks/use-group-members.ts` - メンバー取得・ソートロジック
- ✅ `src/features/group/components/member-card.tsx` - メンバー表示UIコンポーネント
- ✅ 各ディレクトリの `index.ts` でエクスポート設定

**リファクタリングしたファイル**:
- ✅ `src/features/group/components/group-members-list.tsx`
  - **Before**: 107行（ソートロジック、UI含む）
  - **After**: 50行（フックとコンポーネント使用）
  - **削減**: 57行（53%削減）

**更新したimportパス**:
- ✅ `src/app/dashboard/page.tsx`
- ✅ `src/app/dashboard/settings/page.tsx`
- 新パス: `@/features/group`

**検証結果**:
- 型チェック: ✅ 通過
- Lint: ✅ 通過
- フォーマット: ✅ 自動修正完了

**効果**:
- グループ関連コードが `features/group/` に集約
- メンバー表示ロジックが再利用可能なフック・コンポーネントに
- 約50行のコード削減
- 保守性・テスタビリティの向上

**コード比較**:
```tsx
// Before: 107行（複雑なロジック、インラインUI）
export function GroupMembersList({ groupId }: GroupMembersListProps) {
  const members = useQuery(api.groups.getGroupMembers, { groupId });
  const sortedMembers = [...members].sort((a, b) => {
    // ソートロジック...
  });
  
  return (
    // 大量のJSX...
    {sortedMembers.map((member) => (
      // 複雑なメンバー表示UI...
    ))}
  );
}

// After: 50行（シンプル、再利用可能）
export function GroupMembersList({ groupId }: GroupMembersListProps) {
  const { members, isLoading } = useGroupMembers(groupId);
  
  return (
    // シンプルな構造
    {members.map((member) => (
      <MemberCard key={member.userId} member={member} />
    ))}
  );
}
```

---

### 🔜 Phase 4-5（未実施）

残りのフェーズは必要に応じて実施予定。

