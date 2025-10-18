//import { format } from 'date-fns';
import { ja } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Tokyo";

/**
 * 日本時間でフォーマットする
 */
export const formatJST = (date: Date | string, formatStr: string): string => {
  return formatInTimeZone(date, TIMEZONE, formatStr, { locale: ja });
};

/**
 * 現在の日本時間を取得
 */
export const nowJST = (): Date => {
  return toZonedTime(new Date(), TIMEZONE);
};

/**
 * 現在の日本時間をISO文字列で取得
 */
export const nowJSTString = (): string => {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/**
 * 日付を日本時間のDateオブジェクトに変換
 */
export const toJST = (date: Date | string): Date => {
  return toZonedTime(date, TIMEZONE);
};

/**
 * 日本時間のタイムゾーン定数
 */
export const JST_TIMEZONE = TIMEZONE;
