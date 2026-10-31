import { z } from "zod";
import { db, initializeDatabase } from "@/db/database";
import type { BackupFile, DatabaseSnapshot } from "@/types";
import { getChallengeEndDate, toDateKey } from "@/utils/dates";

export const DATABASE_SCHEMA_VERSION = 1;

const id = z.number().int().positive();
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Expected a valid timestamp.");
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && toDateKey(date) === value;
}, "Expected a valid calendar date.");
const categorySchema = z.object({
  id,
  name: z.string().min(1),
  color: z.string().min(1),
  isCustom: z.boolean(),
  createdAt: timestamp,
});
const activitySchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string(),
  categoryId: z.number().int().positive(),
  dailyTarget: z.number().positive(),
  targetUnit: z.enum(["sessions", "minutes", "pages", "repetitions", "custom"]),
  estimatedMinutes: z.number().nonnegative(),
  isActive: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const dailyRecordSchema = z.object({
  id,
  date: dateKey,
  activityId: z.number().int().positive(),
  completed: z.boolean(),
  timeSpentMinutes: z.number().nonnegative(),
  notes: z.string(),
  referenceLinks: z.array(z.string().url().refine((value) => /^https?:\/\//i.test(value))),
  updatedAt: timestamp,
});
const challengeSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string(),
  categoryId: z.number().int().positive(),
  startDate: dateKey,
  endDate: dateKey,
  status: z.enum(["active", "paused", "completed", "archived"]),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const challengeRecordSchema = z.object({
  id,
  challengeId: z.number().int().positive(),
  date: dateKey,
  completed: z.boolean(),
  note: z.string(),
  updatedAt: timestamp,
});
const journalSchema = z.object({
  id,
  date: dateKey,
  completedToday: z.string(),
  learnedToday: z.string(),
  mistakesToday: z.string(),
  improveTomorrow: z.string(),
  prioritiesTomorrow: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const settingsSchema = z.object({
  key: z.literal("app"),
  theme: z.enum(["dark", "light"]),
  weekStartsOn: z.enum(["monday", "sunday"]),
  hideCompletedActivities: z.boolean(),
});

const backupSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: timestamp,
  data: z.object({
    activities: z.array(activitySchema),
    dailyRecords: z.array(dailyRecordSchema),
    challenges: z.array(challengeSchema),
    challengeRecords: z.array(challengeRecordSchema),
    journalEntries: z.array(journalSchema),
    categories: z.array(categorySchema),
    settings: z.array(settingsSchema).max(1),
  }),
});

export function createBackup(snapshot: DatabaseSnapshot): BackupFile {
  return {
    schemaVersion: DATABASE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: snapshot,
  };
}

export function validateBackup(value: unknown): BackupFile {
  const parsed = backupSchema.parse(value);
  if (parsed.schemaVersion !== DATABASE_SCHEMA_VERSION) {
    throw new Error(`This backup uses schema version ${parsed.schemaVersion}. This app supports version ${DATABASE_SCHEMA_VERSION}.`);
  }
  const data = parsed.data;
  const categoryIds = new Set(data.categories.map((category) => category.id));
  const activityIds = new Set(data.activities.map((activity) => activity.id));
  const challengeIds = new Set(data.challenges.map((challenge) => challenge.id));

  if (data.activities.some((activity) => !categoryIds.has(activity.categoryId))) {
    throw new Error("This backup refers to a category that is not included.");
  }
  if (data.challenges.some((challenge) => !categoryIds.has(challenge.categoryId))) {
    throw new Error("This backup refers to a challenge category that is not included.");
  }
  if (data.challenges.some((challenge) => challenge.endDate !== getChallengeEndDate(challenge.startDate))) {
    throw new Error("A challenge in this backup does not have a valid 30-day date range.");
  }
  if (data.dailyRecords.some((record) => !activityIds.has(record.activityId))) {
    throw new Error("This backup contains a daily record for a missing activity.");
  }
  if (data.challengeRecords.some((record) => !challengeIds.has(record.challengeId))) {
    throw new Error("This backup contains a check-in for a missing challenge.");
  }
  const challengeById = new Map(data.challenges.map((challenge) => [challenge.id, challenge]));
  if (data.challengeRecords.some((record) => {
    const challenge = challengeById.get(record.challengeId);
    return !challenge || record.date < challenge.startDate || record.date > challenge.endDate;
  })) {
    throw new Error("A challenge check-in in this backup falls outside its challenge dates.");
  }

  return parsed as BackupFile;
}

export async function restoreBackup(value: unknown): Promise<void> {
  const backup = validateBackup(value);
  const data = backup.data;

  await db.transaction(
    "rw",
    [db.activities, db.dailyRecords, db.challenges, db.challengeRecords, db.journalEntries, db.categories, db.settings],
    async () => {
      await Promise.all([
        db.activities.clear(),
        db.dailyRecords.clear(),
        db.challenges.clear(),
        db.challengeRecords.clear(),
        db.journalEntries.clear(),
        db.categories.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        data.activities.length ? db.activities.bulkPut(data.activities) : Promise.resolve(),
        data.dailyRecords.length ? db.dailyRecords.bulkPut(data.dailyRecords) : Promise.resolve(),
        data.challenges.length ? db.challenges.bulkPut(data.challenges) : Promise.resolve(),
        data.challengeRecords.length ? db.challengeRecords.bulkPut(data.challengeRecords) : Promise.resolve(),
        data.journalEntries.length ? db.journalEntries.bulkPut(data.journalEntries) : Promise.resolve(),
        data.categories.length ? db.categories.bulkPut(data.categories) : Promise.resolve(),
        data.settings.length ? db.settings.bulkPut(data.settings) : Promise.resolve(),
      ]);
    },
  );
  await initializeDatabase();
}

function escapeCsv(value: string | number | boolean): string {
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function createRecordsCsv(snapshot: DatabaseSnapshot): string {
  const activityById = new Map(snapshot.activities.map((activity) => [activity.id, activity]));
  const categoryById = new Map(snapshot.categories.map((category) => [category.id, category]));
  const columns = ["date", "activity", "category", "completed", "timeSpentMinutes", "notes", "referenceLinks"];
  const rows = snapshot.dailyRecords
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const activity = activityById.get(record.activityId);
      const category = activity ? categoryById.get(activity.categoryId) : undefined;
      return [
        record.date,
        activity?.name ?? "Deleted activity",
        category?.name ?? "",
        record.completed,
        record.timeSpentMinutes,
        record.notes,
        record.referenceLinks.join(" | "),
      ].map(escapeCsv).join(",");
    });
  return [columns.map(escapeCsv).join(","), ...rows].join("\n");
}

export function downloadFile(contents: string, filename: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}