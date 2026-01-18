import { describe, expect, it } from "vitest";
import {
  createNotificationPayload,
  determineTimingFromSettings,
  type NotificationSettings,
} from "../scheduler";

describe("determineTimingFromSettings - タイミング判定", () => {
  const defaultSettings: NotificationSettings = {
    morningTime: 480, // 8:00
    noonTime: 720, // 12:00
    eveningTime: 1080, // 18:00
    bedtimeTime: 1260, // 21:00
  };

  describe("正確な時刻でのマッチ", () => {
    it("朝の通知時刻と一致する場合はmorningを返す", () => {
      const result = determineTimingFromSettings(480, defaultSettings);
      expect(result).toBe("morning");
    });

    it("昼の通知時刻と一致する場合はnoonを返す", () => {
      const result = determineTimingFromSettings(720, defaultSettings);
      expect(result).toBe("noon");
    });

    it("夕方の通知時刻と一致する場合はeveningを返す", () => {
      const result = determineTimingFromSettings(1080, defaultSettings);
      expect(result).toBe("evening");
    });

    it("就寝前の通知時刻と一致する場合はbedtimeを返す", () => {
      const result = determineTimingFromSettings(1260, defaultSettings);
      expect(result).toBe("bedtime");
    });
  });

  describe("15分以内の許容範囲", () => {
    it("15分前でもマッチする", () => {
      // 朝8:00の15分前（7:45 = 465分）
      const result = determineTimingFromSettings(465, defaultSettings);
      expect(result).toBe("morning");
    });

    it("15分後でもマッチする", () => {
      // 朝8:00の15分後（8:15 = 495分）
      const result = determineTimingFromSettings(495, defaultSettings);
      expect(result).toBe("morning");
    });

    it("16分以上ずれるとマッチしない", () => {
      // 朝8:00の16分前（7:44 = 464分）
      const result = determineTimingFromSettings(464, defaultSettings);
      expect(result).toBeNull();
    });

    it("複数のタイミングの中間時刻はマッチしない", () => {
      // 朝と昼の中間（10:00 = 600分）
      const result = determineTimingFromSettings(600, defaultSettings);
      expect(result).toBeNull();
    });
  });

  describe("カスタム通知時刻", () => {
    it("カスタム設定された時刻でマッチする", () => {
      const customSettings: NotificationSettings = {
        morningTime: 420, // 7:00
        noonTime: 780, // 13:00
        eveningTime: 1110, // 18:30
        bedtimeTime: 1320, // 22:00
      };

      expect(determineTimingFromSettings(420, customSettings)).toBe("morning");
      expect(determineTimingFromSettings(780, customSettings)).toBe("noon");
      expect(determineTimingFromSettings(1110, customSettings)).toBe("evening");
      expect(determineTimingFromSettings(1320, customSettings)).toBe("bedtime");
    });
  });

  describe("境界値テスト", () => {
    it("深夜0:00（0分）でマッチするタイミングがない", () => {
      const result = determineTimingFromSettings(0, defaultSettings);
      expect(result).toBeNull();
    });

    it("23:59（1439分）でマッチするタイミングがない", () => {
      const result = determineTimingFromSettings(1439, defaultSettings);
      expect(result).toBeNull();
    });
  });
});

describe("createNotificationPayload - 通知ペイロード作成", () => {
  const baseRecord = {
    _id: "record123",
    medicineName: "ロキソニン",
    groupId: "group123",
  };

  describe("基本的な通知", () => {
    it("基本的な通知ペイロードを作成する", () => {
      const payload = createNotificationPayload(baseRecord, "morning");

      expect(payload.title).toBe("服薬リマインダー");
      expect(payload.body).toBe("ロキソニン（朝）");
      expect(payload.tag).toBe("medication-reminder-record123");
      expect(payload.data.recordId).toBe("record123");
      expect(payload.data.timing).toBe("morning");
      expect(payload.data.isSnoozeReminder).toBe(false);
    });

    it("アイコンとバッジが設定される", () => {
      const payload = createNotificationPayload(baseRecord, "morning");

      expect(payload.icon).toBe("/icon-192x192.png");
      expect(payload.badge).toBe("/icon-192x192.png");
    });
  });

  describe("タイミング別の表示", () => {
    it.each([
      ["morning", "朝"],
      ["noon", "昼"],
      ["evening", "夕"],
      ["bedtime", "就寝前"],
    ])("%s タイミングは「%s」と表示される", (timing, label) => {
      const payload = createNotificationPayload(baseRecord, timing);
      expect(payload.body).toContain(`（${label}）`);
    });
  });

  describe("用量表示", () => {
    it("用量があれば表示に含める", () => {
      const recordWithDosage = {
        ...baseRecord,
        dosage: { amount: 60, unit: "mg" },
      };

      const payload = createNotificationPayload(recordWithDosage, "morning");

      expect(payload.body).toBe("ロキソニン 60mg（朝）");
    });

    it("用量がなければ薬名のみ表示", () => {
      const payload = createNotificationPayload(baseRecord, "morning");

      expect(payload.body).toBe("ロキソニン（朝）");
    });

    it("錠単位の用量も正しく表示", () => {
      const recordWithDosage = {
        ...baseRecord,
        dosage: { amount: 2, unit: "錠" },
      };

      const payload = createNotificationPayload(recordWithDosage, "noon");

      expect(payload.body).toBe("ロキソニン 2錠（昼）");
    });
  });

  describe("スヌーズ再通知", () => {
    it("スヌーズ再通知の場合はタイトルが変わる", () => {
      const payload = createNotificationPayload(baseRecord, "morning", true);

      expect(payload.title).toBe("服薬リマインダー（再通知）");
      expect(payload.data.isSnoozeReminder).toBe(true);
    });
  });

  describe("アクションボタン", () => {
    it("スヌーズ可能な場合は2つのアクションが設定される", () => {
      const recordNoSnooze = {
        ...baseRecord,
        snoozeCount: 0,
      };

      const payload = createNotificationPayload(recordNoSnooze, "morning");

      expect(payload.actions).toHaveLength(2);
      expect(payload.actions?.[0]).toEqual({
        action: "taken",
        title: "服用済み",
      });
      expect(payload.actions?.[1]).toEqual({
        action: "snooze",
        title: "後で（10分）",
      });
    });

    it("スヌーズ上限に達した場合は服用済みボタンのみ", () => {
      const recordMaxSnooze = {
        ...baseRecord,
        snoozeCount: 3, // MAX_SNOOZE_COUNT
      };

      const payload = createNotificationPayload(recordMaxSnooze, "morning");

      expect(payload.actions).toHaveLength(1);
      expect(payload.actions?.[0]).toEqual({
        action: "taken",
        title: "服用済み",
      });
    });

    it("スヌーズ回数が未定義の場合はスヌーズ可能", () => {
      const payload = createNotificationPayload(baseRecord, "morning");

      expect(payload.actions).toHaveLength(2);
    });

    it("スヌーズ1回目でもスヌーズ可能", () => {
      const recordOneSnooze = {
        ...baseRecord,
        snoozeCount: 1,
      };

      const payload = createNotificationPayload(recordOneSnooze, "morning");

      expect(payload.actions).toHaveLength(2);
    });

    it("スヌーズ2回目でもスヌーズ可能", () => {
      const recordTwoSnooze = {
        ...baseRecord,
        snoozeCount: 2,
      };

      const payload = createNotificationPayload(recordTwoSnooze, "morning");

      expect(payload.actions).toHaveLength(2);
    });
  });

  describe("data フィールド", () => {
    it("必要なデータが全て含まれる", () => {
      const payload = createNotificationPayload(baseRecord, "evening");

      expect(payload.data).toEqual({
        url: "/",
        recordId: "record123",
        timing: "evening",
        isSnoozeReminder: false,
      });
    });
  });
});
