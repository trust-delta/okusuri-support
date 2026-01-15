# 数値フォーマットユーティリティ仕様

**最終更新**: 2025年11月17日

## 概要

数値の表示フォーマット、通貨表示、パーセンテージ表示などの汎用的な数値処理を提供するユーティリティライブラリ。UI上で数値をユーザーフレンドリーな形式で表示するために使用されます。

---

## ユースケース

### 主要シナリオ

**シナリオ1: 統計情報の表示**
1. 服薬統計画面で服薬率を表示する際、0.856を「85.6%」に変換
2. 服薬回数を表示する際、1234を「1,234」に変換
3. ユーザーが直感的に数値を理解できる

**シナリオ2: 金額の表示**
1. 将来的な薬剤費用表示機能で1500円を「¥1,500」に変換
2. 小数点以下は四捨五入して整数表示
3. カンマ区切りで読みやすく表示

**シナリオ3: 精度を要する数値計算**
1. 統計計算で小数点以下2桁に丸める必要がある
2. JavaScriptの浮動小数点演算の誤差を回避
3. 正確な四捨五入結果を取得

---

## 機能要件

### 数値フォーマット

#### formatNumber
- **説明**: 数値をカンマ区切りでフォーマット。小数点以下の桁数を指定可能。
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  formatNumber(1234.56)      // => "1,234.56"
  formatNumber(1234.567, 2)  // => "1,234.57"
  formatNumber(1234)         // => "1,234"
  ```

#### formatPercentage
- **説明**: 0.0〜1.0の数値を0%〜100%のパーセンテージ表示に変換。
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  formatPercentage(0.856)     // => "85.6%"
  formatPercentage(0.856, 2)  // => "85.60%"
  formatPercentage(0.5)       // => "50.0%"
  ```

#### formatCurrency
- **説明**: 数値を日本円（¥記号付き、カンマ区切り）で表示。小数点以下は四捨五入。
- **優先度**: 中
- **実装状況**: 完了
- **使用例**:
  ```typescript
  formatCurrency(1500)      // => "¥1,500"
  formatCurrency(1234.56)   // => "¥1,235"
  formatCurrency(1000000)   // => "¥1,000,000"
  ```

#### roundToDecimal
- **説明**: 数値を指定桁数で四捨五入。浮動小数点演算の誤差を最小限に抑える。
- **優先度**: 高
- **実装状況**: 完了
- **使用例**:
  ```typescript
  roundToDecimal(3.14159, 2)  // => 3.14
  roundToDecimal(2.5, 0)      // => 3
  roundToDecimal(1.005, 2)    // => 1.01
  ```

---

## 技術仕様

### ファイル構成

```
app/_shared/lib/number-utils.ts
```

### 関数シグネチャ

#### formatNumber
```typescript
export function formatNumber(
  value: number,
  decimalPlaces?: number
): string
```

**パラメータ**:
- `value`: フォーマット対象の数値
- `decimalPlaces`: 小数点以下の桁数（省略可能）

**戻り値**: カンマ区切りでフォーマットされた文字列

**実装詳細**:
- `decimalPlaces`が指定されている場合、`roundToDecimal`で四捨五入
- `toLocaleString("ja-JP")`でカンマ区切り形式に変換
- 最大20桁まで小数点以下を表示可能

#### formatPercentage
```typescript
export function formatPercentage(
  value: number,
  decimalPlaces = 1
): string
```

**パラメータ**:
- `value`: 変換対象の数値（0.0〜1.0）
- `decimalPlaces`: 小数点以下の桁数（デフォルト: 1）

**戻り値**: パーセンテージ表示の文字列

**実装詳細**:
- `value * 100`でパーセンテージに変換
- `formatNumber`を使用してフォーマット
- 末尾に`%`を付与

#### formatCurrency
```typescript
export function formatCurrency(value: number): string
```

**パラメータ**:
- `value`: フォーマット対象の金額

**戻り値**: 日本円表示の文字列

**実装詳細**:
- `Math.round`で小数点以下を四捨五入
- `formatNumber`を使用してカンマ区切り
- 先頭に`¥`記号を付与

#### roundToDecimal
```typescript
export function roundToDecimal(
  value: number,
  decimalPlaces: number
): number
```

**パラメータ**:
- `value`: 四捨五入対象の数値
- `decimalPlaces`: 小数点以下の桁数

**戻り値**: 四捨五入された数値

**実装詳細**:
- `10 ** decimalPlaces`で乗数を計算
- `Math.round(value * multiplier) / multiplier`で正確に四捨五入
- 浮動小数点演算の誤差を最小限に抑える

---

## ビジネスルール

### フォーマットルール

1. **カンマ区切り**: 3桁ごとにカンマを挿入（日本語ロケール準拠）
   - 例: 1234 → "1,234"

2. **小数点処理**: 四捨五入で桁数を調整
   - 例: 1.005 → 1.01（小数点以下2桁）

3. **通貨表示**: 円記号は全角（¥）、小数点以下は表示しない
   - 例: 1234.56 → "¥1,235"

4. **パーセンテージ**: 0.0〜1.0を0%〜100%に変換、小数点以下はデフォルト1桁
   - 例: 0.856 → "85.6%"

---

## 使用箇所

### 現在の使用箇所

（実装後に追加予定）

### 想定される使用箇所

1. **服薬統計画面**: 服薬率・遵守率のパーセンテージ表示
2. **ダッシュボード**: 各種統計数値のカンマ区切り表示
3. **将来の薬剤費用機能**: 金額の通貨表示
4. **レポート機能**: 数値データの読みやすい表示

---

## パフォーマンス要件

- **処理速度**: 単一の数値フォーマットは1ms未満
- **メモリ使用量**: 最小限（文字列生成のみ）
- **副作用**: なし（純粋関数）

### 最適化戦略

1. `toLocaleString`のネイティブ実装を活用
2. 不要な正規表現や文字列操作を避ける
3. 関数はすべてstateless（状態を持たない）

---

## テスト要件

### ユニットテスト

- [ ] formatNumber: 整数のカンマ区切り
- [ ] formatNumber: 小数点以下の桁数指定
- [ ] formatNumber: 小数点以下の四捨五入
- [ ] formatPercentage: 基本的なパーセンテージ変換
- [ ] formatPercentage: 小数点以下の桁数指定
- [ ] formatCurrency: 基本的な通貨表示
- [ ] formatCurrency: 小数点以下の四捨五入
- [ ] roundToDecimal: 基本的な四捨五入
- [ ] roundToDecimal: 浮動小数点誤差の回避（1.005 → 1.01）
- [ ] エッジケース: 0, 負の数, 非常に大きな数

テスト実装: `app/_shared/lib/__tests__/number-utils.test.ts`（作成予定）

---

## 依存関係

### 内部依存
なし（他のユーティリティに依存しない）

### 外部依存
なし（標準JavaScriptのみ使用）

---

## 関連ドキュメント

- [text-utils.md](./text-utils.md) - テキストフォーマットユーティリティ
- [コーディングスタイルガイド](../../coding-style.md)
- [プロジェクト概要](../../project.md)

---

## 実装ファイル

**パス**: `app/_shared/lib/number-utils.ts`

**エクスポート関数**:
- `formatNumber(value: number, decimalPlaces?: number): string`
- `formatPercentage(value: number, decimalPlaces?: number): string`
- `formatCurrency(value: number): string`
- `roundToDecimal(value: number, decimalPlaces: number): number`

---

## 既知の課題

現時点で既知の課題はありません。

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2025年11月17日 | 初版作成 | spec-assistant |
