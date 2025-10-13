import { describe, expect, it } from "vitest";
import { MEDICATION_TIMINGS, type MedicationTiming } from "../timings";

describe("MEDICATION_TIMINGS", () => {
  it("すべてのタイミングが定義されている", () => {
    expect(MEDICATION_TIMINGS).toHaveLength(5);
  });

  it("各タイミングにvalueとlabelが存在する", () => {
    MEDICATION_TIMINGS.forEach((timing) => {
      expect(timing).toHaveProperty("value");
      expect(timing).toHaveProperty("label");
      expect(typeof timing.value).toBe("string");
      expect(typeof timing.label).toBe("string");
    });
  });

  it("朝のタイミングが正しく定義されている", () => {
    const morning = MEDICATION_TIMINGS.find((t) => t.value === "morning");
    expect(morning).toBeDefined();
    expect(morning?.label).toBe("朝");
  });

  it("昼のタイミングが正しく定義されている", () => {
    const noon = MEDICATION_TIMINGS.find((t) => t.value === "noon");
    expect(noon).toBeDefined();
    expect(noon?.label).toBe("昼");
  });

  it("晩のタイミングが正しく定義されている", () => {
    const evening = MEDICATION_TIMINGS.find((t) => t.value === "evening");
    expect(evening).toBeDefined();
    expect(evening?.label).toBe("晩");
  });

  it("就寝前のタイミングが正しく定義されている", () => {
    const bedtime = MEDICATION_TIMINGS.find((t) => t.value === "bedtime");
    expect(bedtime).toBeDefined();
    expect(bedtime?.label).toBe("就寝前");
  });

  it("頓服のタイミングが正しく定義されている", () => {
    const asNeeded = MEDICATION_TIMINGS.find((t) => t.value === "asNeeded");
    expect(asNeeded).toBeDefined();
    expect(asNeeded?.label).toBe("頓服");
  });

  it("MedicationTiming型が正しく推論される", () => {
    const validTimings: MedicationTiming[] = [
      "morning",
      "noon",
      "evening",
      "bedtime",
      "asNeeded",
    ];

    validTimings.forEach((timing) => {
      expect(MEDICATION_TIMINGS.some((t) => t.value === timing)).toBe(true);
    });
  });
});
