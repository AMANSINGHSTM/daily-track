import { initializeDatabase } from "@/db/database";
import {
  deleteActivityAndRecords,
  deleteChallengeAndRecords,
  insertActivity,
  insertCategory,
  insertChallenge,
  loadSnapshot,
  putSettings,
  upsertChallengeRecord,
  upsertDailyRecord,
  upsertJournalEntry,
  updateActivityById,
  updateChallengeStatusById,
} from "@/db/repositories";
import type {
  Activity,
  AppSettings,
  Category,
  Challenge,
  DailyRecord,
  JournalEntry,
  NewActivity,
  NewChallenge,
} from "@/types";
import { getChallengeEndDate } from "@/utils/dates";

export async function loadWorkspaceData() {
  await initializeDatabase();
  return loadSnapshot();
}

export function refreshWorkspaceData() {
  return loadSnapshot();
}

export async function createActivity(input: NewActivity): Promise<void> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Activity names need at least 2 characters.");
  const now = new Date().toISOString();
  await insertActivity({
    ...input,
    name,
    description: input.description.trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateActivity(
  id: number,
  changes: Partial<Omit<Activity, "id" | "createdAt">>,
): Promise<void> {
  const normalizedChanges = { ...changes };
  if (normalizedChanges.name !== undefined) {
    normalizedChanges.name = normalizedChanges.name.trim();
    if (normalizedChanges.name.length < 2) throw new Error("Activity names need at least 2 characters.");
  }
  if (normalizedChanges.description !== undefined) normalizedChanges.description = normalizedChanges.description.trim();
  await updateActivityById(id, normalizedChanges);
}

export function deleteActivity(id: number): Promise<void> {
  return deleteActivityAndRecords(id);
}

export async function createCategory(name: string, existingCategories: Category[]): Promise<void> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Enter a category name first.");
  if (normalizedName.length > 48) throw new Error("Keep category names under 48 characters.");
  if (existingCategories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase())) {
    throw new Error("A category with that name already exists.");
  }
  await insertCategory({
    name: normalizedName,
    color: "#9fbf83",
    isCustom: true,
    createdAt: new Date().toISOString(),
  });
}

export function saveDailyRecord(
  date: string,
  activityId: number,
  changes: Partial<Pick<DailyRecord, "completed" | "timeSpentMinutes" | "notes" | "referenceLinks">>,
): Promise<void> {
  return upsertDailyRecord(date, activityId, changes);
}

export async function createChallenge(input: NewChallenge): Promise<void> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Challenge names need at least 2 characters.");
  const now = new Date().toISOString();
  await insertChallenge({
    ...input,
    name,
    description: input.description.trim(),
    endDate: getChallengeEndDate(input.startDate),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export function updateChallengeStatus(id: number, status: Challenge["status"]): Promise<void> {
  return updateChallengeStatusById(id, status);
}

export function deleteChallenge(id: number): Promise<void> {
  return deleteChallengeAndRecords(id);
}

export function saveChallengeRecord(
  challengeId: number,
  date: string,
  changes: { completed: boolean; note?: string },
): Promise<void> {
  return upsertChallengeRecord(challengeId, date, changes);
}

export function saveJournalEntry(entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): Promise<void> {
  return upsertJournalEntry(entry);
}

export function updateSettings(settings: AppSettings): Promise<void> {
  return putSettings(settings);
}