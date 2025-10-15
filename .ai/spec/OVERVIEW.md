# プロジェクト全体　仕様書

## Vision

家族がサポートできる服薬管理WEBアプリ

## Target Users

- 自身での服薬管理に不安をもつ患者
- 患者の服薬管理をサポートしたい家族

## Core Features

1. 簡単操作の服薬記録
2. 服薬者と支援者のグループ管理
3. 服薬記録のレポート

## Technical Requirements

- リアルタイム更新（WebSocket/Convex）
- オフライン対応（Progressive Web App）
- アクセシビリティ（WCAG 2.1 AA準拠）

## Non-functional Requirements

- レスポンス時間: < 200ms (P95)
- 稼働率: 99.9% (SLA)
- 同時接続: 10,000ユーザー
- データ保持: 無期限、バックアップ1日1回

## Business Constraints

- 月額無料
- 実費発生時点で広告収入
- 買い切り課金で広告OFF
