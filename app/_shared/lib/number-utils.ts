/**
 * 数値フォーマットユーティリティ
 *
 * 数値の表示フォーマット、通貨表示、パーセンテージ表示などの
 * 汎用的な数値処理を提供します。
 */

/**
 * 数値をカンマ区切りでフォーマット
 *
 * 整数部分にカンマを挿入し、小数点以下の桁数を指定できます。
 * decimalPlacesが指定されない場合、元の数値の小数点をそのまま維持します。
 *
 * @param value - フォーマット対象の数値
 * @param decimalPlaces - 小数点以下の桁数（省略可能）
 * @returns カンマ区切りでフォーマットされた文字列
 *
 * @example
 * ```typescript
 * formatNumber(1234.56); // => "1,234.56"
 * formatNumber(1234.567, 2); // => "1,234.57"
 * formatNumber(1234); // => "1,234"
 * formatNumber(1234, 0); // => "1,234"
 * formatNumber(0.123, 3); // => "0.123"
 * ```
 */
export function formatNumber(value: number, decimalPlaces?: number): string {
  // 小数点以下の桁数が指定されている場合は四捨五入
  const roundedValue =
    decimalPlaces !== undefined ? roundToDecimal(value, decimalPlaces) : value;

  // カンマ区切りのフォーマット
  return roundedValue.toLocaleString("ja-JP", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces ?? 20, // 最大20桁まで表示
  });
}

/**
 * 数値をパーセンテージ表示に変換
 *
 * 0.0〜1.0の範囲の数値を0%〜100%に変換してフォーマットします。
 * 小数点以下の桁数を指定できます（デフォルト: 1桁）。
 *
 * @param value - 変換対象の数値（0.0〜1.0）
 * @param decimalPlaces - 小数点以下の桁数（省略可能、デフォルト: 1）
 * @returns パーセンテージ表示の文字列
 *
 * @example
 * ```typescript
 * formatPercentage(0.856); // => "85.6%"
 * formatPercentage(0.856, 2); // => "85.60%"
 * formatPercentage(0.5); // => "50.0%"
 * formatPercentage(0.123456, 0); // => "12%"
 * formatPercentage(1); // => "100.0%"
 * ```
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
  const percentage = value * 100;
  return `${formatNumber(percentage, decimalPlaces)}%`;
}

/**
 * 数値を日本円表示にフォーマット
 *
 * 数値を日本円（¥記号付き、カンマ区切り）で表示します。
 * 小数点以下は四捨五入されます。
 *
 * @param value - フォーマット対象の金額
 * @returns 日本円表示の文字列
 *
 * @example
 * ```typescript
 * formatCurrency(1500); // => "¥1,500"
 * formatCurrency(1234.56); // => "¥1,235"
 * formatCurrency(0); // => "¥0"
 * formatCurrency(1000000); // => "¥1,000,000"
 * ```
 */
export function formatCurrency(value: number): string {
  // 小数点以下を四捨五入
  const roundedValue = Math.round(value);

  // 通貨フォーマット
  return `¥${formatNumber(roundedValue, 0)}`;
}

/**
 * 数値を指定桁数で四捨五入
 *
 * 指定された小数点以下の桁数で四捨五入します。
 * JavaScriptの浮動小数点演算の誤差を最小限に抑えます。
 *
 * @param value - 四捨五入対象の数値
 * @param decimalPlaces - 小数点以下の桁数
 * @returns 四捨五入された数値
 *
 * @example
 * ```typescript
 * roundToDecimal(3.14159, 2); // => 3.14
 * roundToDecimal(2.5, 0); // => 3
 * roundToDecimal(1.005, 2); // => 1.01
 * roundToDecimal(123.456, 1); // => 123.5
 * ```
 */
export function roundToDecimal(value: number, decimalPlaces: number): number {
  // 浮動小数点演算の誤差を最小限に抑えるため、
  // 10の累乗を掛けて整数化してから四捨五入
  const multiplier = 10 ** decimalPlaces;
  return Math.round(value * multiplier) / multiplier;
}
