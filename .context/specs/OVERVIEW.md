# 仕様書概要

**最終更新**: 2026年01月14日

## 主要機能一覧

### コア機能

| 機能 | 説明 | 仕様書 |
|------|------|--------|
| 認証 | パスワード/OTP認証、セッション管理 | [auth.md](features/auth.md) |
| オンボーディング | ロール選択、初期設定フロー | [onboarding.md](features/onboarding.md) |
| グループ管理 | グループ作成・招待・メンバー管理 | [group.md](features/group.md) |

### 服薬管理

| 機能 | 説明 | 仕様書 |
|------|------|--------|
| 服薬記録 | 日々の服薬記録・スケジュール管理 | [medication.md](features/medication.md) |
| 服薬履歴 | 過去の服薬記録一覧・統計 | [medication-history.md](features/medication-history.md) |
| 過去記録編集 | 過去の服薬記録の修正・削除 | [past-medication-record-edit.md](features/past-medication-record-edit.md) |
| 服薬メモ | 服薬記録へのメモ添付 | [medication-memo.md](features/medication-memo.md) |
| 服薬画像 | 時間帯ごとの服薬証拠画像 | [medication-images.md](features/medication-images.md) |
| 残量管理 | 薬の在庫追跡・予定外消費記録 | [medicine-inventory.md](features/medicine-inventory.md) |

### 通知・レポート

| 機能 | 説明 | 仕様書 |
|------|------|--------|
| プッシュ通知 | 服薬リマインダー・アラート通知 | [push-notifications.md](features/push-notifications.md) |
| PDFレポート | 服薬記録のPDF出力 | [pdf-report.md](features/pdf-report.md) |

### UI/UX

| 機能 | 説明 | 仕様書 |
|------|------|--------|
| モバイルナビ | ボトムナビゲーション | [mobile-navigation.md](features/mobile-navigation.md) |

---

## 技術要件

- リアルタイム更新（WebSocket/Convex）
- オフライン対応（Progressive Web App）
- アクセシビリティ（WCAG 2.1 AA準拠）

---

## 非機能要件

| 項目 | 目標値 |
|------|--------|
| レスポンス時間 | < 200ms (P95) |
| 稼働率 | 99.9% (SLA) |
| 同時接続 | 10,000ユーザー未満 |
| データ保持 | 無期限 |

---

## ユーティリティ仕様

| 機能 | 説明 | 仕様書 |
|------|------|--------|
| テキスト処理 | 文字列操作ユーティリティ | [lib/text-utils.md](lib/text-utils.md) |
| 数値処理 | 数値フォーマットユーティリティ | [lib/number-utils.md](lib/number-utils.md) |

---

## 関連ドキュメント

- [プロジェクト概要](../project.md)
- [アーキテクチャ](../architecture.md)
- [決定記録](../decisions/)
