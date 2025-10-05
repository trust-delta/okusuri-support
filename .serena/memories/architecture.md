# アーキテクチャ

## ディレクトリ構造

```
okusuri-support/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── dashboard/    # ダッシュボードページ
│   │   ├── onboarding/   # オンボーディングページ
│   │   ├── api/          # APIルート
│   │   ├── page.tsx      # トップページ
│   │   ├── layout.tsx    # ルートレイアウト
│   │   └── provider.tsx  # Convex Authプロバイダー
│   ├── components/       # Reactコンポーネント
│   │   ├── ui/          # UIコンポーネント
│   │   └── MedicationRecorder.tsx
│   ├── lib/             # ユーティリティ
│   │   ├── utils.ts
│   │   └── date-fns.ts
│   └── middleware.ts    # Next.jsミドルウェア（認証）
├── convex/              # Convexバックエンド
│   ├── schema.ts        # データベーススキーマ
│   ├── auth.ts          # 認証設定
│   ├── auth.config.ts   # 認証設定詳細
│   ├── groups.ts        # グループ関連関数
│   ├── medications.ts   # 服薬記録関数
│   └── http.ts          # HTTPルート
└── public/              # 静的アセット

## データモデル

### groups（グループ）
- name: string
- description?: string
- createdAt: number

### groupMembers（グループメンバー）
- groupId: Id<"groups">
- userId: string (Convex Auth userId)
- role: "patient" | "supporter"
- joinedAt: number

### medications（服薬情報）
- userId: string
- groupId: Id<"groups">
- name: string
- timings: ("morning" | "noon" | "evening" | "bedtime" | "asNeeded")[]
- dosage?: string
- notes?: string

### medicationRecords（服薬記録）
- medicationId: Id<"medications">
- userId: string
- timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded"
- scheduledDate: string (YYYY-MM-DD)
- takenAt?: number
- status: "pending" | "taken" | "skipped"
- recordedBy: string
- notes?: string

## 認証フロー

1. GitHub OAuthで認証
2. Convex Authがセッション管理
3. ミドルウェアで認証状態確認
4. 未認証 → トップページへリダイレクト
5. 認証済みでグループ未設定 → オンボーディングへ
6. 認証済みでグループ設定済み → ダッシュボードへ
