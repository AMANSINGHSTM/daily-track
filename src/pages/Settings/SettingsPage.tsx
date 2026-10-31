import { useRef, useState, type ChangeEvent } from "react";
import { Check, Database, Download, FileDown, FileJson2, Laptop, Moon, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppData } from "@/context/AppContext";
import { createBackup, createRecordsCsv, downloadFile, validateBackup } from "@/services/backupService";
import { toDateKey } from "@/utils/dates";
import type { BackupFile } from "@/types";

export function SettingsPage() {
  const { activities, dailyRecords, challenges, challengeRecords, journalEntries, categories, settings, saveSettings, importBackup } = useAppData();
  const currentSettings = settings[0];
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | undefined>();
  const [backupFeedback, setBackupFeedback] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const totalRecords = dailyRecords.length + challengeRecords.length + journalEntries.length;

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReadingFile(true);
    setBackupFeedback("");
    try {
      const contents = await file.text();
      const parsed = validateBackup(JSON.parse(contents) as unknown);
      setPendingBackup(parsed);
    } catch (error) {
      setBackupFeedback(error instanceof Error ? error.message : "That file could not be read as a valid backup.");
    } finally {
      setReadingFile(false);
      event.target.value = "";
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup) return;
    try {
      await importBackup(pendingBackup);
      setBackupFeedback("Your backup was restored successfully.");
      setPendingBackup(undefined);
    } catch {
      // The shared error banner explains why the restore did not complete.
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Make this space yours"
        title="Settings"
        description="Choose how your workspace looks and keep your personal data safe."
      />

      <div className="settings-layout">
        <div className="settings-main-column">
          <section className="settings-section">
            <div className="settings-section-heading">
              <div><span className="eyebrow">Appearance</span><h2>Theme</h2><p>Set the look that feels right for your daily check-in.</p></div>
              <span className="settings-heading-icon"><Sun size={17} /></span>
            </div>
            <div className="theme-options" role="group" aria-label="Theme preference">
              <button type="button" className={`theme-option${currentSettings.theme === "dark" ? " theme-option-selected" : ""}`} aria-pressed={currentSettings.theme === "dark"} onClick={() => void saveSettings({ ...currentSettings, theme: "dark" }).catch(() => undefined)}>
                <span className="theme-swatch theme-swatch-dark"><Moon size={16} /></span>
                <strong>Dark</strong><small>Quiet, low-light workspace</small>
                {currentSettings.theme === "dark" && <Check className="theme-option-check" size={15} />}
              </button>
              <button type="button" className={`theme-option${currentSettings.theme === "light" ? " theme-option-selected" : ""}`} aria-pressed={currentSettings.theme === "light"} onClick={() => void saveSettings({ ...currentSettings, theme: "light" }).catch(() => undefined)}>
                <span className="theme-swatch theme-swatch-light"><Sun size={16} /></span>
                <strong>Light</strong><small>Bright, focused workspace</small>
                {currentSettings.theme === "light" && <Check className="theme-option-check" size={15} />}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <div><span className="eyebrow">Daily workflow</span><h2>Activity preferences</h2><p>Keep your daily checklist focused on what still needs attention.</p></div>
              <span className="settings-heading-icon"><Check size={17} /></span>
            </div>
            <div className="preference-row">
              <div><strong>Hide completed activities</strong><span>Remove checked activities from the daily tracker list.</span></div>
              <button
                className={`toggle-switch${currentSettings.hideCompletedActivities ? " toggle-switch-on" : ""}`}
                type="button"
                role="switch"
                aria-checked={currentSettings.hideCompletedActivities}
                aria-label="Hide completed activities"
                onClick={() => void saveSettings({ ...currentSettings, hideCompletedActivities: !currentSettings.hideCompletedActivities }).catch(() => undefined)}
              ><span /></button>
            </div>
            <div className="preference-row">
              <div><strong>Week starts on</strong><span>Choose how the weekly analytics view begins.</span></div>
              <div className="week-start-options" role="group" aria-label="First day of the week">
                {(["monday", "sunday"] as const).map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={currentSettings.weekStartsOn === day ? "week-start-selected" : ""}
                    aria-pressed={currentSettings.weekStartsOn === day}
                    onClick={() => void saveSettings({ ...currentSettings, weekStartsOn: day }).catch(() => undefined)}
                  >{day === "monday" ? "Monday" : "Sunday"}</button>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-section backup-section">
            <div className="settings-section-heading">
              <div><span className="eyebrow">Your information</span><h2>Data backup</h2><p>Export a copy to keep your progress safe or move it to another device.</p></div>
              <span className="settings-heading-icon"><Database size={17} /></span>
            </div>
            <div className="backup-actions">
              <div className="backup-action-copy"><FileJson2 size={18} /><div><strong>Full JSON backup</strong><span>Activities, check-ins, challenges, journal, categories, and settings.</span></div></div>
              <Button
                icon={<Download size={15} />}
                onClick={() => {
                  const data = { activities, dailyRecords, challenges, challengeRecords, journalEntries, categories, settings };
                  downloadFile(JSON.stringify(createBackup(data), null, 2), `my-growth-backup-${toDateKey(new Date())}.json`, "application/json");
                  setBackupFeedback("Your JSON backup has been downloaded.");
                }}
              >Export JSON</Button>
            </div>
            <div className="backup-actions">
              <div className="backup-action-copy"><FileDown size={18} /><div><strong>Daily records CSV</strong><span>Spreadsheet-ready activity history with completion, time, notes, and links.</span></div></div>
              <Button
                icon={<Download size={15} />}
                onClick={() => {
                  const data = { activities, dailyRecords, challenges, challengeRecords, journalEntries, categories, settings };
                  downloadFile(createRecordsCsv(data), `my-growth-activity-records-${toDateKey(new Date())}.csv`, "text/csv;charset=utf-8");
                  setBackupFeedback("Your activity CSV has been downloaded.");
                }}
              >Export CSV</Button>
            </div>
            <div className="backup-actions backup-import-row">
              <div className="backup-action-copy"><Upload size={18} /><div><strong>Restore a JSON backup</strong><span>Restoring replaces the current data on this device.</span></div></div>
              <Button icon={<Upload size={15} />} disabled={readingFile} onClick={() => fileInput.current?.click()}>{readingFile ? "Reading..." : "Choose file"}</Button>
              <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void handleImportFile(event)} />
            </div>
            {backupFeedback && <p className="backup-feedback" role="status">{backupFeedback}</p>}
            <p className="privacy-note"><Laptop size={14} /> All data is stored locally in this browser. A backup file is the only way to transfer it.</p>
          </section>
        </div>

        <aside className="settings-info-column">
          <section className="settings-section app-info-section">
            <span className="eyebrow">Workspace information</span>
            <h2>My Growth Dashboard</h2>
            <p>A personal space for practice, reflection, and steady progress.</p>
            <div className="info-list">
              <div><span>Version</span><strong>0.0.0</strong></div>
              <div><span>Storage</span><strong>IndexedDB</strong></div>
              <div><span>Sync</span><strong>Local only</strong></div>
              <div><span>Saved records</span><strong>{totalRecords}</strong></div>
              <div><span>Activities</span><strong>{activities.length}</strong></div>
            </div>
            <p className="local-storage-explainer">Your entries stay in this browser and are not sent to a server. Clearing browser data can remove them, so export a backup regularly.</p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingBackup)}
        title="Replace local data with this backup?"
        description="This will replace all activities, check-ins, challenges, journal entries, categories, and preferences stored in this browser. Export a backup first if you want to keep the current data."
        confirmLabel="Restore backup"
        onCancel={() => setPendingBackup(undefined)}
        onConfirm={() => void handleRestore()}
      />
    </>
  );
}