# 時間帯ごとの服薬画像添付機能仕様

**最終更新**: 2026年01月13日

## 概要

時間帯（朝・昼・晩・就寝前・頓服）ごとに1枚の画像を添付できる機能を提供します。服薬時の様子を写真で記録し、履歴画面で確認できます。服薬確認の証跡として、また医療機関への情報共有に活用できます。

---

## ユースケース

### 主要シナリオ

**シナリオ1: 服薬時に画像を記録**
1. ダッシュボードの服薬記録画面を開く
2. 時間帯グループ（例: 朝）の📷ボタンをタップ
3. カメラ撮影または画像を選択してアップロード
4. 画像が添付され、ボタンが「画像あり」状態に変化

**シナリオ2: 履歴画面で画像を確認**
1. 履歴画面で日付範囲を選択
2. 各時間帯グループにサムネイル画像が表示される
3. サムネイルをタップすると拡大表示

**シナリオ3: 画像を差し替える**
1. 既に画像がある状態で📷ボタンをタップ
2. ダイアログで既存画像を確認
3. 新しい画像をアップロード（古い画像は自動削除）

---

## 機能要件

### 画像アップロード

#### 画像添付機能
- **説明**: 時間帯ごとに1枚の画像を添付する
- **優先度**: 高
- **実装状況**: ✅ 実装済み
- **対応形式**: JPEG, PNG, WebP, HEIC
- **ファイルサイズ制限**: 5MB

#### 画像差し替え機能
- **説明**: 既存の画像を新しい画像に差し替える
- **優先度**: 高
- **実装状況**: ✅ 実装済み
- **動作**: 新画像アップロード時に古い画像を自動削除

#### 画像削除機能
- **説明**: 添付した画像を削除する
- **優先度**: 中
- **実装状況**: ✅ 実装済み

### 画像表示

#### サムネイル表示
- **説明**: 時間帯グループヘッダーに小さなサムネイルを表示
- **優先度**: 高
- **実装状況**: ✅ 実装済み
- **サイズ**: 48x48px（履歴画面）, 32x32px（ダッシュボード）

#### 拡大表示
- **説明**: サムネイルをタップして画像を拡大表示
- **優先度**: 高
- **実装状況**: ✅ 実装済み
- **UI**: ダイアログによるモーダル表示

---

## データモデル

### 新規テーブル

#### `medicationImages`（服薬画像）

```typescript
{
  _id: Id<"medicationImages">,
  groupId: Id<"groups">,           // グループID
  patientId: string,               // 服薬者のConvex Auth userId
  scheduledDate: string,           // YYYY-MM-DD形式
  timing: "morning" | "noon" | "evening" | "bedtime" | "asNeeded",
  imageId: Id<"_storage">,         // Convex Storage ID
  notes: string | undefined,       // 画像メモ（任意）
  uploadedBy: string,              // アップロード者のuserId
  createdAt: number,
  updatedAt: number,
}
```

#### インデックス

| インデックス名 | フィールド | 用途 |
|---------------|-----------|------|
| `by_groupId` | groupId | グループ内画像一覧 |
| `by_patientId` | patientId | 患者の画像一覧 |
| `by_patientId_scheduledDate` | patientId, scheduledDate | 日別画像取得 |
| `by_patientId_timing_scheduledDate` | patientId, timing, scheduledDate | 特定画像取得 |

---

## ビジネスルール

### 画像の制約

1. **1時間帯1枚**: 同じ日付・時間帯には最大1枚まで
   - 理由: シンプルな管理と表示
   - 追加アップロード時: 既存画像を自動削除して差し替え

2. **ファイルサイズ**: 5MB以下
   - 理由: モバイル回線での快適なアップロード
   - 超過時: フロントエンドでバリデーションエラー

3. **対応形式**: JPEG, PNG, WebP, HEIC
   - 理由: 一般的なカメラ/スクリーンショット形式をカバー

### 表示ルール

1. **編集可能時**: アップロードボタンと削除ボタンを表示
2. **閲覧のみ時**: サムネイルのみ表示（過去日など）

---

## 権限設計（RBAC）

### 権限マトリクス

| 操作 | patient | supporter | 備考 |
|------|---------|-----------|------|
| 画像アップロード | ✅ | ✅ | グループメンバーのみ |
| 画像閲覧 | ✅ | ✅ | グループメンバーのみ |
| 画像削除 | ✅ | ✅ | グループメンバーのみ |

---

## API設計

### Query

#### `medications.images.queries.getMedicationImage`
- **用途**: 指定日・時間帯の画像を取得
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    patientId?: string,      // 省略時はグループ内の患者を自動取得
    scheduledDate: string,   // YYYY-MM-DD
    timing: Timing,
  }
  ```
- **戻り値**:
  ```typescript
  {
    _id: string,
    imageUrl: string | null,
    notes?: string,
    timing: string,
    scheduledDate: string,
    createdAt: number,
  } | null
  ```

#### `medications.images.queries.getDayMedicationImages`
- **用途**: 指定日の全時間帯の画像を取得
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    patientId?: string,
    scheduledDate: string,
  }
  ```
- **戻り値**:
  ```typescript
  Record<Timing, {
    _id: string,
    imageUrl: string | null,
    notes?: string,
    timing: string,
    scheduledDate: string,
    createdAt: number,
  }>
  ```

### Mutation

#### `medications.images.mutations.attachMedicationImage`
- **用途**: 画像を添付（既存があれば差し替え）
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    scheduledDate: string,
    timing: Timing,
    storageId: Id<"_storage">,
    notes?: string,
  }
  ```
- **戻り値**: `{ imageId: Id<"medicationImages"> }`

#### `medications.images.mutations.removeMedicationImage`
- **用途**: 画像を削除
- **認証**: 必須
- **引数**:
  ```typescript
  {
    imageId: Id<"medicationImages">,
  }
  ```
- **戻り値**: `{ success: true }`

---

## UI/UX要件

### コンポーネント構成

#### MedicationImageUpload
- **場所**: 時間帯グループヘッダー（編集可能時）
- **モード**:
  - `compact=true`: ボタンのみ表示（ダッシュボード）
  - `compact=false`: フル表示（ダイアログ内）
- **状態表示**:
  - 画像なし: アウトラインボタン
  - 画像あり: プライマリカラーボタン
  - アップロード中: スピナー表示

#### MedicationImageThumbnail
- **場所**: 時間帯グループヘッダー（閲覧時）
- **サイズ**: 48x48px（デフォルト）
- **動作**: タップで拡大ダイアログを表示

### 視覚的識別

#### ボタン状態
- **画像なし**: `variant="outline"`、📷アイコン
- **画像あり**: `variant="default"`、📷アイコン + 「画像あり」ラベル

---

## バリデーション

### フロントエンド

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// ファイルサイズチェック
if (file.size > MAX_FILE_SIZE) {
  toast.error("ファイルサイズは5MB以下にしてください");
  return;
}

// ファイルタイプチェック
if (!ACCEPTED_TYPES.includes(file.type)) {
  toast.error("JPEG、PNG、WebP形式の画像を選択してください");
  return;
}
```

### バックエンド

グループメンバーシップの確認のみ。ファイルサイズ・形式はConvex Storageが処理。

---

## エラーハンドリング

| エラータイプ | メッセージ | 発生条件 | ユーザーアクション |
|--------------|-----------|----------|-------------------|
| 認証エラー | "認証が必要です" | 未認証状態 | ログインページへ遷移 |
| 権限エラー | "このグループのメンバーではありません" | 非メンバー | ダッシュボードへ遷移 |
| ファイルサイズエラー | "ファイルサイズは5MB以下にしてください" | 5MB超過 | 画像を圧縮/リサイズ |
| ファイル形式エラー | "JPEG、PNG、WebP形式の画像を選択してください" | 非対応形式 | 対応形式の画像を選択 |
| アップロードエラー | "画像のアップロードに失敗しました" | ネットワークエラー等 | リトライ |

---

## セキュリティ要件

### 認証
- Convex Auth による認証必須

### 認可
- グループメンバーシップの確認
- 画像削除時は画像IDの所有確認

### データ保護
- 画像はConvex Storage に保存（署名付きURL）
- グループ外のユーザーからアクセス不可

---

## パフォーマンス要件

- **アップロード時間**: < 5秒（5MB画像、良好な回線時）
- **サムネイル表示**: < 500ms
- **最適化**: Next.js Image による自動最適化

---

## 設定要件

### Next.js設定

`next.config.ts` に以下の設定が必要:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.convex.cloud",
    },
  ],
},
```

---

## テスト要件

### ユニットテスト
- [ ] ファイルサイズバリデーション
- [ ] ファイル形式バリデーション

### 統合テスト
- [ ] 画像アップロードAPI
- [ ] 画像取得API
- [ ] 画像削除API

### E2Eテスト
- [ ] 画像アップロードフロー
- [ ] 画像差し替えフロー
- [ ] 画像削除フロー
- [ ] 履歴画面でのサムネイル表示

---

## 依存関係

### 内部依存
- [服薬管理機能](./medication.md): 時間帯グループUI
- [履歴閲覧機能](./medication-history.md): 画像表示
- [認証機能](./auth.md): ユーザー認証

### 外部依存
- **Convex Storage**: 画像保存
- **Next.js Image**: 画像最適化
- **shadcn/ui Dialog**: 画像表示ダイアログ
- **lucide-react**: アイコン（Camera, Upload, Trash2）

---

## マイルストーン

### Phase 1: MVP（完了）
- [x] `medicationImages` テーブル追加
- [x] 画像アップロードAPI実装
- [x] 画像取得API実装
- [x] 画像削除API実装
- [x] MedicationImageUpload コンポーネント作成
- [x] MedicationImageThumbnail コンポーネント作成
- [x] ダッシュボード統合
- [x] 履歴画面統合
- [x] Next.js画像ホスト設定

### Phase 2: 将来検討
- [ ] 画像へのメモ追加機能
- [ ] 複数画像対応
- [ ] 画像圧縮（クライアント側）

---

## 既知の課題

| 課題 | 優先度 | 対応予定 | 備考 |
|------|--------|----------|------|
| HEIC形式の表示 | 低 | 将来検討 | 一部ブラウザで非対応 |
| 大きな画像の圧縮 | 低 | 将来検討 | クライアント側で圧縮 |
| 複数画像対応 | 低 | 将来検討 | 1時間帯複数枚の需要確認後 |

---

## 関連ドキュメント

- [服薬管理機能](./medication.md)
- [履歴閲覧機能](./medication-history.md)
- [服薬メモ機能](./medication-memo.md)
- [プロジェクト概要](../../project.md)
- [アーキテクチャ](../../architecture.md)
