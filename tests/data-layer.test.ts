import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { db, initializeDatabase } from "@/db/database";
import { createBackup, restoreBackup } from "@/services/backupService";
import {
  insertChallenge,
  loadSnapshot,
  upsertChallengeRecord,
  upsertDailyRecord,
  upsertJournalEntry,
} from "@/db/repositories";
import type { Activity } from "@/types";
import { addDays, getChallengeEndDate, toDateKey } from "@/utils/dates";
import { getChallengeProgress, getCurrentStreak, getDailyCounts } from "@/utils/progress";

const today = toDateKey(new Date());
const activityTemplate: Omit<Activity, "id"> = {
  name: "Focused practice",
  description: "A short daily session",
  categoryId: 1,
  dailyTarget: 1,
  targetUnit: "sessions",
  estimatedMinutes: 25,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(async () => {
  db.close();
  await db.delete();
  await initializeDatabase();
});

after(() => db.close());

test("initialization seeds the five categories but no fake progress", async () => {
  assert.equal(await db.categories.count(), 5);
  assert.equal(await db.activities.count(), 0);
  assert.equal(await db.dailyRecords.count(), 0);
  assert.equal((await db.settings.get("app"))?.theme, "dark");
});

test("daily upserts preserve one record per activity and calculate today's rate", async () => {
  const activeId = await db.activities.add({ ...activityTemplate });
  const inactiveId = await db.activities.add({ ...activityTemplate, name: "Paused practice", isActive: false });

  await upsertDailyRecord(today, activeId, { completed: true, notes: "First session" });
  await upsertDailyRecord(today, activeId, { timeSpentMinutes: 27 });
  await upsertDailyRecord(today, inactiveId, { completed: true });

  const records = await db.dailyRecords.toArray();
  assert.equal(records.length, 2);
  const activeRecord = records.find((record) => record.activityId === activeId);
  assert.equal(activeRecord?.completed, true);
  assert.equal(activeRecord?.notes, "First session");
  assert.equal(activeRecord?.timeSpentMinutes, 27);

  const counts = getDailyCounts(await db.activities.toArray(), records, today);
  assert.deepEqual(counts, { completed: 1, total: 1, pending: 0, percentage: 100 });
});

test("challenge check-ins are unique and completing all 30 updates status", async () => {
  const startDate = "2025-01-01";
  const challengeId = await db.challenges.add({
    name: "Thirty days of practice",
    description: "",
    categoryId: 1,
    startDate,
    endDate: getChallengeEndDate(startDate),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  for (let day = 0; day < 30; day += 1) {
    await upsertChallengeRecord(challengeId, addDays(startDate, day), { completed: true });
  }
  await upsertChallengeRecord(challengeId, startDate, { completed: true, note: "Reviewed" });

  const records = await db.challengeRecords.toArray();
  const challenge = await db.challenges.get(challengeId);
  assert.equal(records.length, 30);
  assert.equal(challenge?.status, "completed");
  assert.equal(getChallengeProgress(challenge!, records).percentage, 100);

  await upsertChallengeRecord(challengeId, startDate, { completed: false });
  assert.equal((await db.challenges.get(challengeId))?.status, "active");
  assert.equal(await db.challengeRecords.count(), 30);
});

test("streaks count consecutive days and journal dates upsert", async () => {
  const activityId = await db.activities.add({ ...activityTemplate });
  const streakRecords = [today, addDays(today, -1), addDays(today, -2)].map((date) => ({
    date,
    activityId,
    completed: true,
    timeSpentMinutes: 0,
    notes: "",
    referenceLinks: [],
    updatedAt: new Date().toISOString(),
  }));
  assert.equal(getCurrentStreak(streakRecords, today), 3);

  await upsertJournalEntry({ date: today, completedToday: "Read a chapter", learnedToday: "", mistakesToday: "", improveTomorrow: "", prioritiesTomorrow: "" });
  await upsertJournalEntry({ date: today, completedToday: "Read two chapters", learnedToday: "", mistakesToday: "", improveTomorrow: "", prioritiesTomorrow: "" });
  assert.equal(await db.journalEntries.count(), 1);
  assert.equal((await db.journalEntries.where("date").equals(today).first())?.completedToday, "Read two chapters");
});

test("a JSON backup restores related data and survives a database reopen", async () => {
  const activityId = await db.activities.add({ ...activityTemplate });
  await upsertDailyRecord(today, activityId, { completed: true, notes: "Saved locally" });
  const now = new Date().toISOString();
  await insertChallenge({
    name: "One month of focus",
    description: "",
    categoryId: 1,
    startDate: today,
    endDate: getChallengeEndDate(today),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const snapshot = await loadSnapshot();
  const backup = createBackup(snapshot);
  await db.activities.clear();
  await restoreBackup(backup);
  db.close();
  await initializeDatabase();

  assert.equal(await db.activities.count(), 1);
  assert.equal((await db.dailyRecords.toArray())[0]?.notes, "Saved locally");
  assert.equal(await db.challenges.count(), 1);
  assert.equal(await db.categories.count(), 5);
});