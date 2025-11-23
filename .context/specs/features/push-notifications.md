# プッシュ通知機能仕様

**最終更新**: 2025年11月21日

## 概要

PWA（Progressive Web App）+ Web Push APIを使用した服薬リマインダー通知機能。VAPID認証により、外部サービスに依存せず無料でプッシュ通知を実現。iOS/Android/デスクトップすべてに対応し、服薬時刻になると自動的に通知を送信する。

**iOS対応**: iOS 16.4+でWeb Push APIに対応。ホーム画面へのPWAインストールが必須条件のため、専用の案内UIを実装。

**段階的実装**: 4フェーズで段階的に実装し、各フェーズで動作確認を実施。

---

## ユースケース

### 主要シナリオ

**シナリオ1: iOSユーザーのPWAインストールと通知設定**
1. ユーザーがiOSデバイスでアプリにアクセス
2. アプリ起動後3秒で「ホーム画面に追加」案内バナーが表示
3. ユーザーがSafariの共有ボタンから「ホーム画面に追加」を選択
4. ホーム画面からPWAとして起動
5. 個人設定画面で「通知を有効にする」ボタンをタップ
6. 通知許可ダイアログで「許可」を選択
7. サブスクリプション登録完了、服薬時刻に通知を受け取れるようになる

**シナリオ2: Android/デスクトップユーザーの通知設定**
1. ユーザーがAndroidまたはデスクトップでアプリにアクセス
2. 個人設定画面で「通知を有効にする」ボタンをタップ
3. 通知許可ダイアログで「許可」を選択
4. サブスクリプション登録完了
5. 必要に応じて「アプリをインストール」ボタンから PWAをインストール（任意）

**シナリオ3: 服薬時刻の通知受信**
1. 服薬時刻（朝8時/昼12時/夕18時/就寝前21時 ±15分）になる
2. Convex Cron（15分間隔）がスケジューラーを実行
3. スケジューラーが該当時刻のpending状態の服薬記録を検索
4. グループメンバー全員にプッシュ通知を送信
5. ユーザーのデバイスに通知が表示される（「服薬リマインダー」「○○（薬名） X錠（朝）」）
6. 通知をタップするとアプリのホーム画面に遷移

---

## 機能要件

### PWA基礎（Phase 1）

#### manifest.json設定
- **説明**: PWAとしてインストール可能にするための設定ファイル
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `public/manifest.json`
- **詳細**:
  - `display: "standalone"`: iOS Web Push API対応に必須
  - アプリ名、説明、テーマカラー設定
  - アイコン設定（現在は空配列、今後追加予定）

#### Service Worker実装
- **説明**: プッシュ通知受信とオフライン対応を実現
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `public/sw.js`
- **詳細**:
  - キャッシング戦略（Network First）
  - pushイベントハンドラー（通知表示）
  - notificationclickイベントハンドラー（通知タップ時の動作）

#### Service Worker登録
- **説明**: フロントエンドからService Workerを登録
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `app/_shared/components/register-service-worker.tsx`
- **詳細**:
  - 開発・本番両方で登録（開発環境でのテストのため）
  - Service Worker更新検知

### プッシュ通知基盤（Phase 2）

#### VAPID鍵生成・設定
- **説明**: Web Push API認証用のVAPID鍵ペア生成
- **優先度**: 高
- **実装状況**: 完了
- **詳細**:
  - 公開鍵: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（.env.local）
  - 秘密鍵: `VAPID_PRIVATE_KEY`（Convex環境変数）
  - 既に生成済み

#### サブスクリプション管理
- **説明**: プッシュ通知サブスクリプションのCRUD操作
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/push/mutations.ts`, `convex/push/queries.ts`
- **詳細**:
  - subscribe: サブスクリプション登録・更新（ユーザー単位）
  - unsubscribe: サブスクリプション削除
  - list: ユーザーのサブスクリプション一覧
  - listByUserId: 特定ユーザーのサブスクリプション取得（内部用）

#### 通知送信機能
- **説明**: Web Push APIを使用した通知送信
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/push/actions.ts`（Node.jsランタイム）
- **詳細**:
  - sendTestNotification: テスト通知送信
  - sendToUser: 特定ユーザーに送信
  - sendToGroup: グループ全員に送信
  - エラーハンドリング: 410/404エラー時に自動的にサブスクリプション削除

#### フロントエンドフック
- **説明**: プッシュ通知管理用のReactフック
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `app/_shared/features/push-notifications/hooks/use-push-notifications.ts`
- **詳細**:
  - ブラウザサポート検出
  - 通知許可リクエスト
  - サブスクリプション登録・解除
  - サブスクリプション状態管理

### 服薬リマインダー（Phase 3）

#### Cron設定
- **説明**: 15分ごとに服薬時刻をチェック
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/crons.ts`
- **詳細**: `checkMedicationReminders`を15分間隔で実行

#### スケジューラー実装
- **説明**: 現在時刻に該当する服薬記録を検索して通知送信
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/notifications/scheduler.ts`
- **詳細**:
  - JST時刻取得（date-fns-tz使用）
  - タイミング判定（朝8:00、昼12:00、夕18:00、就寝前21:00 ±15分）
  - pending状態の服薬記録検索
  - グループメンバー全員に通知送信
  - エラーログ記録

#### pending記録検索クエリ
- **説明**: 指定日時・タイミングの未服薬記録を取得
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `convex/notifications/queries.ts`
- **詳細**: internalQueryとして実装、スケジューラーから呼び出し

#### 手動テスト用アクション
- **説明**: 管理画面から手動で服薬リマインダーをトリガー
- **優先度**: 中
- **実装状況**: 完了
- **実装場所**: `convex/notifications/actions.ts`

### iOS対応UI（Phase 4）

#### PWAインストール管理フック
- **説明**: PWAインストール状態を管理するReactフック
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `app/_shared/features/push-notifications/hooks/use-pwa-install.ts`
- **詳細**:
  - iOS検出（iPhone/iPad/iPod）
  - スタンドアロンモード検出
  - beforeinstallpromptイベントキャプチャ
  - インストールプロンプト表示

#### iOS案内バナー
- **説明**: iOSユーザー向けホーム画面追加案内バナー
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `app/_shared/features/push-notifications/components/ios-pwa-install-banner.tsx`
- **詳細**:
  - iOSかつPWA未インストール時のみ表示
  - 3秒後に表示（ページ読み込み直後を避ける）
  - 手順を画像付きで説明
  - 閉じた場合7日間非表示（localStorage利用）

#### PWAインストールボタン
- **説明**: Android/デスクトップ用インストールボタン
- **優先度**: 中
- **実装状況**: 完了
- **実装場所**: `app/_shared/features/push-notifications/components/pwa-install-button.tsx`
- **詳細**: beforeinstallpromptイベント利用可能時のみ表示

#### 通知設定カード
- **説明**: 個人設定画面の通知設定UI
- **優先度**: 高
- **実装状況**: 完了
- **実装場所**: `app/(private)/settings/_components/NotificationSettingsCard.tsx`
- **詳細**:
  - プッシュ通知プロンプト
  - PWAインストールボタン
  - サブスクリプション状態表示
  - グループに依存しないユーザー単位の設定

---

## データモデル

### pushSubscriptions テーブル

```typescript
{
  _id: Id<"pushSubscriptions">,
  userId: string,                        // Convex Auth userId
  endpoint: string,                      // プッシュサービスエンドポイント（一意）
  keys: {
    p256dh: string,                      // 公開鍵（暗号化用）
    auth: string,                        // 認証シークレット
  },
  userAgent?: string,                    // デバイス情報
  createdAt: number,
  updatedAt?: number,
}
```

**インデックス**:
- `by_userId`: ユーザーのサブスクリプション一覧
- `by_endpoint`: エンドポイントによる検索（一意制約）

**設計方針**:
- ユーザー単位で管理（1ユーザー = N デバイス）
- グループとの関連は持たない（通知送信時にグループメンバーを検索）
- 1デバイス = 1サブスクリプション（Web Push APIの仕様）

### ER図
```
users 1----N pushSubscriptions
```

---

## ビジネスルール

### 通知タイミング

1. **服薬時刻**: 朝8:00、昼12:00、夕18:00、就寝前21:00（JST）
   - ±15分の範囲でマッチ（例: 朝は7:45-8:15）
   - 15分ごとのcronで1回のみ通知（重複防止）

2. **pending状態のみ**: statusが"pending"の服薬記録のみ通知対象
   - 既に服薬済み（"taken"）や スキップ済み（"skipped"）は通知しない

### サブスクリプション管理

1. **endpoint一意制約**: 同じendpointは1つのみ登録可能
   - 既存エンドポイントは更新（upsert動作）

2. **ユーザー単位**: サブスクリプションはユーザー単位で管理
   - グループに依存しない（複数グループに所属しても1つのサブスクリプション）
   - ユーザーが複数デバイスを持つ場合は複数サブスクリプション

3. **無効サブスクリプション削除**: 410/404エラー時に自動削除
   - ユーザーが通知を無効化した場合
   - デバイスが変更された場合

### タイムゾーン

1. **JST固定**: 日本国内向けアプリのため、JST（Asia/Tokyo）固定
   - サーバー側（Convex Actions）でJST基準で処理
   - 将来的にユーザー設定可能にする余地あり

---

## 権限設計（RBAC）

### ロール定義

| ロール | 説明 | 主な権限 |
|--------|------|----------|
| patient | 患者ロール | 自分のサブスクリプション管理 |
| supporter | 支援者ロール | 自分のサブスクリプション管理 |

### 権限マトリクス

| 操作 | patient | supporter | 備考 |
|------|---------|-----------|------|
| サブスクリプション登録 | ✅ | ✅ | 自分のデバイスのみ |
| サブスクリプション解除 | ✅ | ✅ | 自分のデバイスのみ |
| グループ通知受信 | ✅ | ✅ | グループメンバー全員 |
| テスト通知送信 | ✅ | ✅ | 自分宛のみ |

---

## API設計

### Queries（データ取得）

#### `list`
- **用途**: 現在のユーザーのサブスクリプション一覧
- **認証**: 必須
- **引数**: なし
- **戻り値**: `Array<PushSubscription>`

#### `getByEndpoint`
- **用途**: エンドポイントによるサブスクリプション取得
- **認証**: 必須
- **引数**: `{ endpoint: string }`
- **戻り値**: `PushSubscription | null`

#### `listByUserId` (internal)
- **用途**: 特定ユーザーのサブスクリプション一覧取得
- **認証**: internal（通知送信時に使用）
- **引数**: `{ userId: string }`
- **戻り値**: `Array<PushSubscription>`

#### `getPendingRecordsByTiming` (internal)
- **用途**: 指定日時・タイミングの未服薬記録取得
- **認証**: internal（スケジューラーからのみ）
- **引数**: `{ date: string, timing: "morning" | "noon" | "evening" | "bedtime" }`
- **戻り値**: `Array<PendingRecord>`

### Mutations（データ更新）

#### `subscribe`
- **用途**: プッシュ通知サブスクリプション登録・更新
- **認証**: 必須
- **引数**:
  ```typescript
  {
    subscription: {
      endpoint: string,
      keys: { p256dh: string, auth: string }
    },
    userAgent?: string
  }
  ```
- **戻り値**: `{ subscriptionId: Id<"pushSubscriptions">, isNew: boolean }`
- **副作用**: pushSubscriptions: 作成/更新（同一endpointは更新）

#### `unsubscribe`
- **用途**: サブスクリプション削除
- **認証**: 必須
- **引数**: `{ endpoint: string }`
- **戻り値**: `boolean`
- **副作用**: pushSubscriptions: 削除

#### `unsubscribeAll`
- **用途**: ユーザーの全サブスクリプション削除
- **認証**: 必須
- **引数**: なし
- **戻り値**: `number`（削除件数）
- **副作用**: pushSubscriptions: 複数削除

### Actions（外部連携）

#### `sendTestNotification`
- **用途**: テスト通知送信
- **認証**: 必須
- **引数**: なし
- **戻り値**: `{ success: boolean, sent: number, failed: number, errors?: string[] }`
- **外部依存**: web-push（Node.js）

#### `sendToUser`
- **用途**: 特定ユーザーに通知送信
- **認証**: 必須
- **引数**:
  ```typescript
  {
    userId: string,
    payload: {
      title: string,
      body: string,
      icon?: string,
      badge?: string,
      tag?: string,
      data?: any
    }
  }
  ```
- **戻り値**: `{ success: boolean, sent: number, errors?: string[] }`
- **外部依存**: web-push（Node.js）

#### `sendToGroup`
- **用途**: グループ全員に通知送信
- **認証**: 必須
- **引数**:
  ```typescript
  {
    groupId: Id<"groups">,
    payload: {
      title: string,
      body: string,
      icon?: string,
      badge?: string,
      tag?: string,
      data?: any
    }
  }
  ```
- **戻り値**: `{ success: boolean, sent: number, total: number, errors?: string[] }`
- **外部依存**: web-push（Node.js）

#### `checkMedicationReminders` (internal)
- **用途**: 服薬リマインダーをチェックして通知送信
- **認証**: internal（cronからのみ）
- **引数**: なし
- **戻り値**: `{ sent: number, checked: number, errors?: string[], message: string }`
- **外部依存**: web-push（Node.js）

#### `testMedicationReminders`
- **用途**: 手動で服薬リマインダーをトリガー（テスト用）
- **認証**: 必須
- **引数**: なし
- **戻り値**: internalActionの結果
- **外部依存**: web-push（Node.js）

詳細: [API仕様書](../api/push-notifications-api.md)（未作成）

---

## UI/UX要件

### 画面構成

#### 個人設定画面（`/settings`）
- **パス**: `/settings`
- **目的**: 個人設定とプッシュ通知設定
- **主要コンポーネント**:
  - `NotificationSettingsCard`: 通知設定カード
    - `PushNotificationPrompt`: プッシュ通知プロンプト
    - `PWAInstallButton`: PWAインストールボタン

#### グローバルバナー（全ページ）
- **目的**: iOSユーザーへのPWAインストール案内
- **主要コンポーネント**:
  - `IOSPWAInstallBanner`: iOS案内バナー

### インタラクション

1. **通知を有効にする**:
   - トリガー: 「通知を有効にする」ボタンクリック
   - フィードバック:
     - 通知許可ダイアログ表示
     - 許可後、成功メッセージ表示
     - カード表示が「通知が有効です」に変更

2. **通知を無効にする**:
   - トリガー: 「通知を無効にする」ボタンクリック
   - フィードバック:
     - サブスクリプション削除
     - カード表示が通知促進に戻る

3. **PWAインストール**:
   - トリガー: 「アプリをインストール」ボタンクリック
   - フィードバック: ブラウザネイティブのインストールダイアログ表示

4. **iOS案内バナーを閉じる**:
   - トリガー: バナーの×ボタンクリック
   - フィードバック: バナーが非表示に（7日間）

---

## バリデーション

### フロントエンド

```typescript
// VAPID公開鍵の存在確認
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  throw new Error("VAPID公開鍵が設定されていません");
}

// ブラウザサポート確認
const isSupported =
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
```

### バックエンド

```typescript
// convex/push/mutations.ts
// エンドポイント一意性確認（upsert動作）
const existing = await ctx.db
  .query("pushSubscriptions")
  .withIndex("by_endpoint", (q) => q.eq("endpoint", args.subscription.endpoint))
  .first();

// 既存の場合は更新、新規の場合は作成
if (existing) {
  await ctx.db.patch(existing._id, {
    userId,
    keys: args.subscription.keys,
    userAgent: args.userAgent,
    updatedAt: Date.now(),
  });
} else {
  await ctx.db.insert("pushSubscriptions", {
    userId,
    endpoint: args.subscription.endpoint,
    keys: args.subscription.keys,
    userAgent: args.userAgent,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
```

---

## エラーハンドリング

| エラータイプ | メッセージ | 発生条件 | ユーザーアクション |
|--------------|-----------|----------|-------------------|
| ブラウザ非サポート | "このブラウザはプッシュ通知をサポートしていません" | Service Worker/PushManager未サポート | 対応ブラウザに変更 |
| 通知許可拒否 | "通知許可が拒否されました" | Notification.permission === "denied" | ブラウザ設定から許可 |
| VAPID鍵未設定 | "VAPID公開鍵が設定されていません" | 環境変数未設定 | 開発者が環境変数設定 |
| サブスクリプション削除エラー | "サブスクリプション解除に失敗しました" | ネットワークエラー等 | 再試行 |
| 通知送信エラー（410/404） | - | サブスクリプション無効 | 自動削除（ユーザーアクション不要） |

---

## セキュリティ要件

### 認証
- **Convex Auth**: すべてのMutations/Queries/Actionsで認証必須
- **internalQuery/internalAction**: スケジューラー専用、外部から直接呼び出し不可

### 認可
- グループメンバーシップチェック: サブスクリプション登録時に確認
- 自分のサブスクリプションのみ削除可能

### データ保護
- **VAPID秘密鍵**: Convex環境変数で安全に管理、Git管理外
- **サブスクリプション情報**: endpointとkeysは暗号化なしで保存（Web Push API仕様に準拠）

---

## パフォーマンス要件

- **レスポンスタイム**: サブスクリプション登録 < 2秒
- **通知送信時間**: cron実行から通知送信まで < 30秒
- **同時接続数**: グループあたり最大100人まで想定
- **データ量**: ユーザーあたり平均2-3デバイス（スマホ、タブレット、PC）

### 最適化戦略
1. **インデックス最適化**: by_endpoint, by_groupIdインデックスで高速検索
2. **バッチ処理**: グループ単位で通知をまとめて送信
3. **エラーハンドリング**: 無効サブスクリプションの自動削除で不要なリトライを防止
4. **cron間隔**: 15分間隔で過度なポーリングを防止

---

## テスト要件

### ユニットテスト
- [ ] subscribe: 新規登録と更新の動作確認
- [ ] unsubscribe: サブスクリプション削除の動作確認
- [ ] listByGroup: メンバーシップチェックの動作確認
- [ ] determineTimingFromTime: タイミング判定ロジックの正確性
- [ ] createNotificationPayload: 通知ペイロード生成の正確性

### 統合テスト
- [ ] サブスクリプション登録→通知送信→受信の一連フロー
- [ ] グループ脱退時のサブスクリプション削除
- [ ] 無効サブスクリプションの自動削除（410/404エラー）
- [ ] 複数デバイスへの同時通知送信

### E2Eテスト
- [ ] iOSユーザー: PWAインストール→通知許可→通知受信
- [ ] Androidユーザー: 通知許可→通知受信
- [ ] デスクトップユーザー: 通知許可→PWAインストール→通知受信
- [ ] 服薬時刻の通知送信（cron動作確認）

テスト実装: `convex/push/__tests__/`, `convex/notifications/__tests__/`（未作成）

---

## 依存関係

### 内部依存
- **グループ機能**: サブスクリプションはグループ単位で管理
- **服薬記録機能**: pending状態の記録を通知対象として検索
- **認証機能**: Convex Authによるユーザー認証

### 外部依存
- **web-push**: Web Push API送信ライブラリ（Node.js）
- **date-fns-tz**: JST時刻変換ライブラリ
- **Service Worker API**: ブラウザネイティブAPI
- **Notification API**: ブラウザネイティブAPI
- **PushManager API**: ブラウザネイティブAPI

---

## マイルストーン

### Phase 1: PWA基礎（完了）
- [x] manifest.json作成
- [x] Service Worker実装
- [x] Service Worker登録コンポーネント
- [x] PWAメタデータ設定

### Phase 2: プッシュ通知基盤（完了）
- [x] VAPID鍵生成・設定
- [x] pushSubscriptionsスキーマ定義
- [x] サブスクリプション管理（mutations, queries）
- [x] 通知送信機能（actions）
- [x] フロントエンドフック（use-push-notifications）
- [x] 通知許可プロンプトUI

### Phase 3: 服薬リマインダー（完了）
- [x] Cron設定（15分間隔）
- [x] スケジューラー実装（JST対応）
- [x] pending記録検索クエリ
- [x] 手動テスト用アクション
- [x] 通知ペイロード生成ロジック

### Phase 4: iOS対応UI（完了）
- [x] PWAインストール管理フック
- [x] iOS案内バナー
- [x] PWAインストールボタン
- [x] グループ詳細画面への通知設定カード追加

### Phase 5: 最適化・拡張（未着手）
- [ ] アイコン作成（192x192, 512x512 PNG）
- [ ] 複数通知タイミング設定（ユーザーカスタマイズ）
- [ ] 通知履歴機能
- [ ] 通知設定画面（独立ページ）
- [ ] ユニットテスト・E2Eテスト実装
- [ ] パフォーマンスモニタリング

---

## 既知の課題

| 課題 | 優先度 | 対応予定 | 備考 |
|------|--------|----------|------|
| iOSではPWAインストールが必須 | 中 | Phase 4で対応済み | iOS案内バナーで誘導 |
| アイコン未設定 | 低 | Phase 5 | manifest.jsonのiconsが空配列 |
| テスト未実装 | 中 | Phase 5 | ユニットテスト・E2Eテストが未作成 |
| タイムゾーン固定（JST） | 低 | 未定 | 将来的にユーザー設定可能に |
| 通知履歴なし | 低 | Phase 5 | ユーザーが過去の通知を確認できない |

---

## 関連ドキュメント

- [プロジェクト概要](../../project.md)
- [アーキテクチャ](../../architecture.md)
- [決定記録: プッシュ通知実装](../../decisions/2025-11-20-push-notification-implementation.md)
- [コーディング規約](../../coding-style.md)
- [エラーハンドリング](../../error-handling.md)
- [テスト戦略](../../testing-strategy.md)
