"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MedicineData {
  id: string;
  name: string;
  dosage: {
    amount: string; // フォームでは文字列として扱う
    unit: string;
  };
  timings: {
    morning: boolean;
    noon: boolean;
    evening: boolean;
    bedtime: boolean;
    asNeeded: boolean;
  };
  description?: string;
}

const UNIT_OPTIONS = [
  { value: "回", label: "回" },
  { value: "錠", label: "錠" },
  { value: "カプセル", label: "カプセル" },
  { value: "包", label: "包" },
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mL", label: "mL" },
] as const;

interface MedicineEntryProps {
  index: number;
  medicine: MedicineData;
  onChange: (medicine: MedicineData) => void;
  onRemove: () => void;
}

const TIMING_LABELS = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
  bedtime: "就寝前",
  asNeeded: "頓服",
} as const;

export function MedicineEntry({
  index,
  medicine,
  onChange,
  onRemove,
}: MedicineEntryProps) {
  const handleTimingChange = (
    timing: keyof MedicineData["timings"],
    checked: boolean,
  ) => {
    onChange({
      ...medicine,
      timings: {
        ...medicine.timings,
        [timing]: checked,
      },
    });
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          薬 {index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`medicine-${index}-name`}>薬名 *</Label>
        <Input
          id={`medicine-${index}-name`}
          value={medicine.name}
          onChange={(e) => onChange({ ...medicine, name: e.target.value })}
          placeholder="例: ロキソニン"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>用量</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id={`medicine-${index}-dosage-amount`}
              type="number"
              step="1"
              min="0"
              value={medicine.dosage.amount}
              onChange={(e) =>
                onChange({
                  ...medicine,
                  dosage: { ...medicine.dosage, amount: e.target.value },
                })
              }
              placeholder="数量"
            />
          </div>
          <div className="w-32">
            <Select
              value={medicine.dosage.unit}
              onValueChange={(value) =>
                onChange({
                  ...medicine,
                  dosage: { ...medicine.dosage, unit: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="単位" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>服用タイミング *（複数選択可）</Label>
        <div className="flex flex-wrap gap-4">
          {(
            Object.keys(TIMING_LABELS) as Array<keyof typeof TIMING_LABELS>
          ).map((timing) => (
            <div key={timing} className="flex items-center space-x-2">
              <Checkbox
                id={`medicine-${index}-timing-${timing}`}
                checked={medicine.timings[timing]}
                onCheckedChange={(checked) =>
                  handleTimingChange(timing, checked as boolean)
                }
              />
              <label
                htmlFor={`medicine-${index}-timing-${timing}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {TIMING_LABELS[timing]}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
