import type { Activity, Challenge, ChallengeRecord, DailyRecord } from "@/types";
import { addDays, differenceInDays, toDateKey } from "@/utils/dates";

export function recordsForDate(records: DailyRecord[], date: string): DailyRecord[] {
  return records.filter((record) => record.date === date);
}

export function getDailyCounts(activities: Activity[], records: DailyRecord[], date: string) {
  const active = activities.filter((activity) => activity.isActive);
  const completedIds = new Set(
    records.filter((record) => record.date === date && record.completed).map((record) => record.activityId),
  );
  const completed = active.filter((activity) => activity.id && completedIds.has(activity.id)).length;
  const total = active.length;
  return { completed, total, pending: Math.max(0, total - completed), percentage: total ? Math.round((completed / total) * 100) : 0 };
}

export function getCurrentStreak(records: DailyRecord[], referenceDate = toDateKey(new Date())): number {
  const completedDates = new Set(records.filter((record) => record.completed).map((record) => record.date));
  let cursor = completedDates.has(referenceDate) ? referenceDate : addDays(referenceDate, -1);
  if (!completedDates.has(cursor)) return 0;

  let streak = 0;
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getChallengeProgress(challenge: Challenge, records: ChallengeRecord[]) {
  const completedDays = records.filter((record) => record.challengeId === challenge.id && record.completed);
  const daysCompleted = new Set(completedDays.map((record) => record.date)).size;
  const today = toDateKey(new Date());
  const streakDates = new Set(completedDays.map((record) => record.date));
  let cursor = streakDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (cursor >= challenge.startDate && streakDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return {
    daysCompleted,
    percentage: Math.round((daysCompleted / 30) * 100),
    streak,
  };
}

export function getActivityDailyRate(
  activities: Activity[],
  records: DailyRecord[],
  date: string,
): number {
  const eligible = activities.filter((activity) => getActivityCreatedDateKey(activity) <= date);
  if (eligible.length === 0) return 0;
  const completed = new Set(
    records.filter((record) => record.date === date && record.completed).map((record) => record.activityId),
  );
  return Math.round((eligible.filter((activity) => activity.id && completed.has(activity.id)).length / eligible.length) * 100);
}

export function getActivityAgeInDays(activity: Activity, today = toDateKey(new Date())): number {
  return Math.min(30, Math.max(1, differenceInDays(getActivityCreatedDateKey(activity), today) + 1));
}

export function getActivityCreatedDateKey(activity: Activity): string {
  return toDateKey(new Date(activity.createdAt));
}