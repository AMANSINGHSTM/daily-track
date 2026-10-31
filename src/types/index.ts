export type ThemePreference = "dark" | "light";
export type TargetUnit = "sessions" | "minutes" | "pages" | "repetitions" | "custom";
export type ChallengeStatus = "active" | "paused" | "completed" | "archived";

export interface Category {
  id?: number;
  name: string;
  color: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Activity {
  id?: number;
  name: string;
  description: string;
  categoryId: number;
  dailyTarget: number;
  targetUnit: TargetUnit;
  estimatedMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRecord {
  id?: number;
  date: string;
  activityId: number;
  completed: boolean;
  timeSpentMinutes: number;
  notes: string;
  referenceLinks: string[];
  updatedAt: string;
}

export interface Challenge {
  id?: number;
  name: string;
  description: string;
  categoryId: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeRecord {
  id?: number;
  challengeId: number;
  date: string;
  completed: boolean;
  note: string;
  updatedAt: string;
}

export interface JournalEntry {
  id?: number;
  date: string;
  completedToday: string;
  learnedToday: string;
  mistakesToday: string;
  improveTomorrow: string;
  prioritiesTomorrow: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  key: "app";
  theme: ThemePreference;
  weekStartsOn: "monday" | "sunday";
  hideCompletedActivities: boolean;
}

export type NewActivity = Omit<Activity, "id" | "createdAt" | "updatedAt" | "isActive">;
export type NewChallenge = Omit<Challenge, "id" | "endDate" | "status" | "createdAt" | "updatedAt">;

export interface DatabaseSnapshot {
  activities: Activity[];
  dailyRecords: DailyRecord[];
  challenges: Challenge[];
  challengeRecords: ChallengeRecord[];
  journalEntries: JournalEntry[];
  categories: Category[];
  settings: AppSettings[];
}

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  data: DatabaseSnapshot;
}