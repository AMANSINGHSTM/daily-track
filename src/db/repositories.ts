import { db, defaultSettings } from "@/db/database";
import type {
  Activity,
  AppSettings,
  Category,
  Challenge,
  ChallengeRecord,
  DailyRecord,
  JournalEntry,
} from "@/types";
import { isValidDateKey, toDateKey } from "@/utils/dates";

export async function loadSnapshot() {
  const [activities, dailyRecords, challenges, challengeRecords, journalEntries, categories, storedSettings] =
    await Promise.all([
      db.activities.toArray(),
      db.dailyRecords.toArray(),
      db.challenges.toArray(),
      db.challengeRecords.toArray(),
      db.journalEntries.toArray(),
      db.categories.toArray(),
      db.settings.get("app"),
    ]);

  return {
    activities: activities.sort((a, b) => a.name.localeCompare(b.name)),
    dailyRecords,
    challenges: challenges.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    challengeRecords,
    journalEntries: journalEntries.sort((a, b) => b.date.localeCompare(a.date)),
    categories: categories.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
    settings: [storedSettings ?? defaultSettings],
  };
}

export async function insertActivity(activity: Omit<Activity, "id">): Promise<void> {
  await db.transaction("rw", db.activities, db.categories, async () => {
    if (!(await db.categories.get(activity.categoryId))) throw new Error("Choose an available category.");
    await db.activities.add(activity);
  });
}

export async function updateActivityById(id: number, changes: Partial<Omit<Activity, "id" | "createdAt">>): Promise<void> {
  await db.transaction("rw", db.activities, db.categories, async () => {
    if (changes.categoryId !== undefined && !(await db.categories.get(changes.categoryId))) {
      throw new Error("Choose an available category.");
    }
    await db.activities.update(id, { ...changes, updatedAt: new Date().toISOString() });
  });
}

export async function deleteActivityAndRecords(id: number): Promise<void> {
  await db.transaction("rw", db.activities, db.dailyRecords, async () => {
    await db.dailyRecords.where("activityId").equals(id).delete();
    await db.activities.delete(id);
  });
}

export async function insertCategory(category: Omit<Category, "id">): Promise<void> {
  await db.categories.add(category);
}

export async function upsertDailyRecord(
  date: string,
  activityId: number,
  changes: Partial<Pick<DailyRecord, "completed" | "timeSpentMinutes" | "notes" | "referenceLinks">>,
): Promise<void> {
  if (!isValidDateKey(date) || date > toDateKey(new Date())) throw new Error("Daily records can only be saved for today or an earlier date.");
  await db.transaction("rw", db.dailyRecords, db.activities, async () => {
    if (!(await db.activities.get(activityId))) throw new Error("This activity is no longer available.");
    const existing = await db.dailyRecords.where("[date+activityId]").equals([date, activityId]).first();
    if (existing?.id !== undefined) {
      await db.dailyRecords.update(existing.id, { ...changes, updatedAt: new Date().toISOString() });
      return;
    }
    await db.dailyRecords.add({
      date,
      activityId,
      completed: changes.completed ?? false,
      timeSpentMinutes: changes.timeSpentMinutes ?? 0,
      notes: changes.notes ?? "",
      referenceLinks: changes.referenceLinks ?? [],
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function insertChallenge(challenge: Omit<Challenge, "id">): Promise<void> {
  if (!isValidDateKey(challenge.startDate)) throw new Error("Choose a valid challenge start date.");
  await db.transaction("rw", db.challenges, db.categories, async () => {
    if (!(await db.categories.get(challenge.categoryId))) throw new Error("Choose an available category.");
    await db.challenges.add(challenge);
  });
}

export async function updateChallengeStatusById(id: number, status: Challenge["status"]): Promise<void> {
  await db.challenges.update(id, { status, updatedAt: new Date().toISOString() });
}

export async function deleteChallengeAndRecords(id: number): Promise<void> {
  await db.transaction("rw", db.challenges, db.challengeRecords, async () => {
    await db.challengeRecords.where("challengeId").equals(id).delete();
    await db.challenges.delete(id);
  });
}

export async function upsertChallengeRecord(
  challengeId: number,
  date: string,
  changes: Partial<Pick<ChallengeRecord, "completed" | "note">>,
): Promise<void> {
  await db.transaction("rw", db.challengeRecords, db.challenges, async () => {
    const challenge = await db.challenges.get(challengeId);
    if (!isValidDateKey(date) || date > toDateKey(new Date()) || !challenge || date < challenge.startDate || date > challenge.endDate) {
      throw new Error("That day is outside this challenge.");
    }
    const existing = await db.challengeRecords.where("[challengeId+date]").equals([challengeId, date]).first();
    if (existing?.id !== undefined) {
      await db.challengeRecords.update(existing.id, { ...changes, updatedAt: new Date().toISOString() });
    } else {
      await db.challengeRecords.add({
        challengeId,
        date,
        completed: changes.completed ?? false,
        note: changes.note ?? "",
        updatedAt: new Date().toISOString(),
      });
    }

    if (challenge.status === "active" || challenge.status === "completed") {
      const completedCount = await db.challengeRecords.where("challengeId").equals(challengeId).and((record) => record.completed).count();
      const status = completedCount >= 30 ? "completed" : "active";
      if (challenge.status !== status) await db.challenges.update(challengeId, { status, updatedAt: new Date().toISOString() });
    }
  });
}

export async function upsertJournalEntry(entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): Promise<void> {
  if (!isValidDateKey(entry.date) || entry.date > toDateKey(new Date())) throw new Error("Journal entries can only be saved for today or an earlier date.");
  await db.transaction("rw", db.journalEntries, async () => {
    const existing = await db.journalEntries.where("date").equals(entry.date).first();
    const timestamp = new Date().toISOString();
    if (existing?.id !== undefined) {
      await db.journalEntries.update(existing.id, { ...entry, updatedAt: timestamp });
      return;
    }
    await db.journalEntries.add({ ...entry, createdAt: timestamp, updatedAt: timestamp });
  });
}

export async function putSettings(settings: AppSettings): Promise<void> {
  await db.settings.put(settings);
}