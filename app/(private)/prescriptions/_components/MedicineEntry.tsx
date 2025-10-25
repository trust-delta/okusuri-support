"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MedicineData {
  name: string;
  dosage: string;
  timings: {
    morning: boolean;
    noon: boolean;
    evening: boolean;
    bedtime: boolean;
    asNeeded: boolean;
  };
  description?: string;
}

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

      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor={`medicine-${index}-dosage`}>用量</Label>
          <Input
            id={`medicine-${index}-dosage`}
            value={medicine.dosage}
            onChange={(e) => onChange({ ...medicine, dosage: e.target.value })}
            placeholder="例: 1錠"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>服用タイミング *（複数選択可）</Label>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(TIMING_LABELS) as Array<keyof typeof TIMING_LABELS>).map(
            (timing) => (
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
            ),
          )}
        </div>
      </div>
    </div>
  );
}
