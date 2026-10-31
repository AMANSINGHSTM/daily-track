import Dexie, { type Table } from "dexie";
import type {
  Activity,
  AppSettings,
  Category,
  Challenge,
  ChallengeRecord,
  DailyRecord,
  JournalEntry,
} from "@/types";

export class GrowthDatabase extends Dexie {
  activities!: Table<Activity, number>;
  dailyRecords!: Table<DailyRecord, number>;
  challenges!: Table<Challenge, number>;
  challengeRecords!: Table<ChallengeRecord, number>;
  journalEntries!: Table<JournalEntry, number>;
  categories!: Table<Category, number>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("my-growth-dashboard");
    this.version(1).stores({
      activities: "++id, name, categoryId, isActive, createdAt",
      dailyRecords: "++id, &[date+activityId], date, activityId, completed",
      challenges: "++id, name, status, startDate, categoryId",
      challengeRecords: "++id, &[challengeId+date], challengeId, date, completed",
      journalEntries: "++id, &date, createdAt",
      categories: "++id, &name, isCustom",
      settings: "&key",
    });
  }
}

export const db = new GrowthDatabase();

const defaultCategories: Omit<Category, "id">[] = [
  { name: "English Communication", color: "#a7d779", isCustom: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { name: "Technical Skills", color: "#8eadd4", isCustom: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { name: "Personality Development", color: "#b49bcf", isCustom: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { name: "Career Development & Job Preparation", color: "#d6b479", isCustom: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { name: "Health & Discipline", color: "#81b8a4", isCustom: false, createdAt: "2026-01-01T00:00:00.000Z" },
];

export const defaultSettings: AppSettings = {
  key: "app",
  theme: "dark",
  weekStartsOn: "monday",
  hideCompletedActivities: false,
};

export async function initializeDatabase(): Promise<void> {
  await db.open();
  await db.transaction("rw", db.categories, db.settings, async () => {
    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(defaultCategories);
    }
    if (!(await db.settings.get("app"))) {
      await db.settings.add(defaultSettings);
    }
  });
}