import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultSettings } from "@/db/database";
import { restoreBackup } from "@/services/backupService";
import {
  createActivity,
  createCategory,
  createChallenge,
  deleteActivity,
  deleteChallenge,
  refreshWorkspaceData,
  loadWorkspaceData,
  saveChallengeRecord,
  saveDailyRecord,
  saveJournalEntry,
  updateActivity,
  updateChallengeStatus,
  updateSettings,
} from "@/services/growthService";
import type {
  Activity,
  AppSettings,
  Challenge,
  DatabaseSnapshot,
  DailyRecord,
  JournalEntry,
  NewActivity,
  NewChallenge,
} from "@/types";

interface AppContextValue extends DatabaseSnapshot {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addActivity: (activity: NewActivity) => Promise<void>;
  editActivity: (id: number, changes: Partial<Omit<Activity, "id" | "createdAt">>) => Promise<void>;
  removeActivity: (id: number) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  saveRecord: (
    date: string,
    activityId: number,
    changes: Partial<Pick<DailyRecord, "completed" | "timeSpentMinutes" | "notes" | "referenceLinks">>,
  ) => Promise<void>;
  addChallenge: (challenge: NewChallenge) => Promise<void>;
  setChallengeStatus: (id: number, status: Challenge["status"]) => Promise<void>;
  removeChallenge: (id: number) => Promise<void>;
  saveChallengeDay: (
    challengeId: number,
    date: string,
    changes: { completed: boolean; note?: string },
  ) => Promise<void>;
  saveJournal: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  importBackup: (value: unknown) => Promise<void>;
}

const emptySnapshot: DatabaseSnapshot = {
  activities: [],
  dailyRecords: [],
  challenges: [],
  challengeRecords: [],
  journalEntries: [],
  categories: [],
  settings: [defaultSettings],
};

const AppContext = createContext<AppContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const nextSnapshot = await refreshWorkspaceData();
    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadWorkspaceData()
      .then((nextSnapshot) => {
        if (mounted) setSnapshot(nextSnapshot);
      })
      .catch((reason: unknown) => {
        if (mounted) setError(getErrorMessage(reason));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = snapshot.settings[0]?.theme ?? "dark";
  }, [snapshot.settings]);

  const mutate = useCallback(async (operation: () => Promise<void>) => {
    try {
      await operation();
      await reload();
      setError(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
      throw reason;
    }
  }, [reload]);

  const addActivity = useCallback((activity: NewActivity) => mutate(() => createActivity(activity)), [mutate]);
  const editActivity = useCallback((id: number, changes: Partial<Omit<Activity, "id" | "createdAt">>) =>
    mutate(() => updateActivity(id, changes)), [mutate]);
  const removeActivity = useCallback((id: number) => mutate(() => deleteActivity(id)), [mutate]);
  const addCategory = useCallback(async (name: string) => {
    try {
      await mutate(() => createCategory(name, snapshot.categories));
    } catch (reason) {
      setError(getErrorMessage(reason));
      throw reason;
    }
  }, [mutate, snapshot.categories]);
  const saveRecord = useCallback((
    date: string,
    activityId: number,
    changes: Partial<Pick<DailyRecord, "completed" | "timeSpentMinutes" | "notes" | "referenceLinks">>,
  ) => mutate(() => saveDailyRecord(date, activityId, changes)), [mutate]);
  const addChallenge = useCallback((challenge: NewChallenge) =>
    mutate(() => createChallenge(challenge)), [mutate]);
  const setChallengeStatus = useCallback((id: number, status: Challenge["status"]) =>
    mutate(() => updateChallengeStatus(id, status)), [mutate]);
  const removeChallenge = useCallback((id: number) => mutate(() => deleteChallenge(id)), [mutate]);
  const saveChallengeDay = useCallback((challengeId: number, date: string, changes: { completed: boolean; note?: string }) =>
    mutate(() => saveChallengeRecord(challengeId, date, changes)), [mutate]);
  const saveJournal = useCallback((entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) =>
    mutate(() => saveJournalEntry(entry)), [mutate]);
  const saveSettings = useCallback((settings: AppSettings) => mutate(() => updateSettings(settings)), [mutate]);
  const importBackup = useCallback((value: unknown) => mutate(() => restoreBackup(value)), [mutate]);
  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AppContextValue>(() => ({
    ...snapshot,
    loading,
    error,
    clearError,
    addActivity,
    editActivity,
    removeActivity,
    addCategory,
    saveRecord,
    addChallenge,
    setChallengeStatus,
    removeChallenge,
    saveChallengeDay,
    saveJournal,
    saveSettings,
    importBackup,
  }), [
    snapshot,
    loading,
    error,
    clearError,
    addActivity,
    editActivity,
    removeActivity,
    addCategory,
    saveRecord,
    addChallenge,
    setChallengeStatus,
    removeChallenge,
    saveChallengeDay,
    saveJournal,
    saveSettings,
    importBackup,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppData must be used inside AppProvider.");
  return context;
}