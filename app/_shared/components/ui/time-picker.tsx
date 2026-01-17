"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface TimePickerProps {
  /** 時刻（分単位: 0-1439） */
  value: number;
  /** 時刻変更時のコールバック */
  onChange: (value: number) => void;
  /** 無効化フラグ */
  disabled?: boolean;
  /** ラベル */
  label?: string;
}

/**
 * 分単位の時刻から時・分を取得
 */
function minutesToHourAndMinute(totalMinutes: number): {
  hour: number;
  minute: number;
} {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
}

/**
 * 時・分から分単位の時刻を計算
 */
function hourAndMinuteToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/**
 * 時刻選択コンポーネント
 *
 * 時間（0-23）と分（0/15/30/45）のSelectで構成
 */
export function TimePicker({
  value,
  onChange,
  disabled = false,
  label,
}: TimePickerProps) {
  const { hour, minute } = useMemo(
    () => minutesToHourAndMinute(value),
    [value],
  );

  // 15分刻みに丸める
  const roundedMinute = Math.round(minute / 15) * 15;
  const displayMinute = roundedMinute === 60 ? 0 : roundedMinute;

  const handleHourChange = (newHour: string) => {
    const hourValue = Number.parseInt(newHour, 10);
    onChange(hourAndMinuteToMinutes(hourValue, displayMinute));
  };

  const handleMinuteChange = (newMinute: string) => {
    const minuteValue = Number.parseInt(newMinute, 10);
    onChange(hourAndMinuteToMinutes(hour, minuteValue));
  };

  // 時間のオプション（0-23）
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  // 分のオプション（0/15/30/45）
  const minutes = useMemo(() => [0, 15, 30, 45], []);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
      <div className="flex items-center gap-1">
        <Select
          value={hour.toString()}
          onValueChange={handleHourChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="時" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((h) => (
              <SelectItem key={h} value={h.toString()}>
                {h.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">:</span>

        <Select
          value={displayMinute.toString()}
          onValueChange={handleMinuteChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="分" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {m.toString().padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * 分単位の時刻を表示用文字列に変換
 */
export function formatTimeFromMinutes(totalMinutes: number): string {
  const { hour, minute } = minutesToHourAndMinute(totalMinutes);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}
