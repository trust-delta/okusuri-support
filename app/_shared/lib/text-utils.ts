/**
 * テキスト正規化ユーティリティ
 *
 * テキストの正規化、切り詰め、サニタイズなどの汎用的な文字列処理を提供します。
 */

/**
 * テキストを正規化
 *
 * 全角英数字を半角に変換し、前後の空白をトリムし、連続する空白を1つに統一します。
 *
 * @param text - 正規化対象のテキスト
 * @returns 正規化されたテキスト
 *
 * @example
 * ```typescript
 * normalizeText("  Hello   World  "); // => "Hello World"
 * normalizeText("Hello\u3000World"); // => "Hello World" (全角スペース→半角)
 * normalizeText("ABC123"); // => "ABC123" (全角→半角)
 * ```
 */
export function normalizeText(text: string): string {
  return (
    text
      // 全角英数字を半角に変換
      .replace(/[A-Za-z0-9]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
      })
      // 全角スペースを半角スペースに変換
      .replace(/\u3000/g, " ")
      // 前後の空白をトリム
      .trim()
      // 連続する空白を1つに統一
      .replace(/\s+/g, " ")
  );
}

/**
 * テキストを指定文字数で切り詰め
 *
 * 指定された最大文字数を超える場合は切り詰め、サフィックスを追加します。
 * 最大文字数以下の場合はそのまま返します。
 *
 * @param text - 切り詰め対象のテキスト
 * @param maxLength - 最大文字数（サフィックスを含む）
 * @param suffix - 切り詰め時に追加するサフィックス（デフォルト: "..."）
 * @returns 切り詰められたテキスト
 *
 * @example
 * ```typescript
 * truncateText("こんにちは、世界", 5); // => "こんに..."
 * truncateText("短い", 10); // => "短い"
 * truncateText("長いテキスト", 5, "…"); // => "長いテ…"
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = "...",
): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncatedLength = maxLength - suffix.length;
  return text.slice(0, truncatedLength) + suffix;
}

/**
 * 入力テキストをサニタイズ
 *
 * HTMLタグの除去と基本的なXSS対策を行います。
 * ユーザー入力を表示する前に使用することで、基本的なセキュリティリスクを軽減します。
 *
 * @param text - サニタイズ対象のテキスト
 * @returns サニタイズされたテキスト
 *
 * @example
 * ```typescript
 * sanitizeInput("<script>alert('XSS')</script>"); // => ""
 * sanitizeInput("<b>太字</b>テキスト"); // => "太字テキスト"
 * sanitizeInput("通常のテキスト"); // => "通常のテキスト"
 * ```
 */
export function sanitizeInput(text: string): string {
  return (
    text
      // HTMLタグを除去
      .replace(/<[^>]*>/g, "")
      // 危険な文字をエスケープ
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
  );
}
