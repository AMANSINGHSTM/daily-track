import { useMemo, useState, useEffect } from "react";
import { Archive, CalendarDays, Check, ChevronDown, CircleDot, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppData } from "@/context/AppContext";
import { ChallengeDialog, type ChallengeFormValues } from "@/pages/Challenges/ChallengeDialog";
import { addDays, differenceInDays, formatDate, toDateKey } from "@/utils/dates";
import { getChallengeProgress } from "@/utils/progress";
import type { Challenge, ChallengeRecord } from "@/types";

export function ChallengesPage() {
  const { challenges, categories, challengeRecords, addChallenge, setChallengeStatus, removeChallenge, saveChallengeDay } = useAppData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [deleting, setDeleting] = useState<Challenge | undefined>();
  const currentChallenges = challenges.filter((challenge) => challenge.status === "active" || challenge.status === "paused");
  const history = challenges.filter((challenge) => challenge.status === "completed" || challenge.status === "archived");

  const handleCreate = async (values: ChallengeFormValues) => {
    await addChallenge(values);
  };

  return (
    <>
      <PageHeader
        eyebrow="Thirty days, one intention"
        title="Challenges"
        description="Turn a goal into a daily promise you can keep."
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setDialogOpen(true)}>New challenge</Button>}
      />

      {currentChallenges.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={21} />}
          title="Make space for one focused goal"
          description="A 30-day challenge gives one area of growth a little more structure."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setDialogOpen(true)}>Start a challenge</Button>}
        />
      ) : (
        <section className="challenge-list" aria-label="Current challenges">
          {currentChallenges.map((challenge) => (
            <ChallengeItem
              key={challenge.id}
              challenge={challenge}
              categoryName={categories.find((category) => category.id === challenge.categoryId)?.name ?? "Uncategorized"}
              records={challengeRecords.filter((record) => record.challengeId === challenge.id)}
              onStatusChange={(status) => challenge.id !== undefined && void setChallengeStatus(challenge.id, status).catch(() => undefined)}
              onSaveDay={(date, changes) => challenge.id !== undefined ? saveChallengeDay(challenge.id, date, changes) : Promise.resolve()}
              onDelete={() => setDeleting(challenge)}
            />
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section className="challenge-history">
          <button className="history-heading" type="button" onClick={() => setShowHistory((visible) => !visible)}>
            <span><Archive size={15} /> Past challenges <small>{history.length}</small></span>
            <ChevronDown className={showHistory ? "chevron-open" : ""} size={16} />
          </button>
          {showHistory && (
            <div className="challenge-history-list">
              {history.map((challenge) => {
                const progress = getChallengeProgress(challenge, challengeRecords);
                return (
                  <div className="challenge-history-row" key={challenge.id}>
                    <span className={`challenge-history-mark${challenge.status === "completed" ? " history-complete" : ""}`}>
                      {challenge.status === "completed" ? <Check size={14} /> : <Archive size={13} />}
                    </span>
                    <div className="challenge-history-copy">
                      <strong>{challenge.name}</strong>
                      <span>{categories.find((category) => category.id === challenge.categoryId)?.name ?? "Uncategorized"} | {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
                    </div>
                    <span className="challenge-history-progress">{progress.daysCompleted} / 30 days</span>
                    <IconButton aria-label={`Delete ${challenge.name}`} onClick={() => setDeleting(challenge)}><Trash2 size={15} /></IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <ChallengeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={handleCreate} categories={categories} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this challenge?"
        description="All daily check-ins for this challenge will be permanently removed."
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting?.id !== undefined) void removeChallenge(deleting.id).catch(() => undefined);
          setDeleting(undefined);
        }}
      />
    </>
  );
}

function ChallengeItem({
  challenge,
  categoryName,
  records,
  onStatusChange,
  onSaveDay,
  onDelete,
}: {
  challenge: Challenge;
  categoryName: string;
  records: ChallengeRecord[];
  onStatusChange: (status: Challenge["status"]) => void;
  onSaveDay: (date: string, changes: { completed: boolean; note?: string }) => Promise<void>;
  onDelete: () => void;
}) {
  const today = toDateKey(new Date());
  const calendarDates = useMemo(() => Array.from({ length: 30 }, (_, index) => addDays(challenge.startDate, index)), [challenge.startDate]);
  const initialSelectedDate = today < challenge.startDate ? challenge.startDate : today > challenge.endDate ? challenge.endDate : today;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const selectedRecord = records.find((record) => record.date === selectedDate);
  const [note, setNote] = useState(selectedRecord?.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const progress = getChallengeProgress(challenge, records);
  const completedDates = new Set(records.filter((record) => record.completed).map((record) => record.date));
  const dayNumber = differenceInDays(challenge.startDate, selectedDate) + 1;
  const canMark = selectedDate <= today && (challenge.status === "active" || (challenge.status === "paused" && selectedDate < today));
  const statusLabel = challenge.status === "paused" ? "Paused" : challenge.status === "completed" ? "Complete" : "In progress";

  useEffect(() => {
    setNote(selectedRecord?.note ?? "");
  }, [selectedRecord, selectedDate]);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await onSaveDay(selectedDate, { completed: Boolean(selectedRecord?.completed), note });
    } catch {
      // The shared page banner surfaces persistence errors.
    } finally {
      setSavingNote(false);
    }
  };

  const toggleSelectedDay = () => {
    if (canMark) void onSaveDay(selectedDate, { completed: !selectedRecord?.completed, note: note.trim() }).catch(() => undefined);
  };

  return (
    <article className="challenge-item">
      <div className="challenge-item-heading">
        <div className="challenge-title-copy">
          <div className="challenge-category-line"><span className="challenge-kicker"><CircleDot size={12} /> {categoryName}</span><span className={`challenge-state state-${challenge.status}`}>{statusLabel}</span></div>
          <h2>{challenge.name}</h2>
          {challenge.description && <p>{challenge.description}</p>}
        </div>
        <div className="challenge-actions">
          {challenge.status === "paused" ? (
            <Button size="sm" icon={<Play size={14} />} onClick={() => onStatusChange("active")}>Resume</Button>
          ) : challenge.status === "active" ? (
            <Button size="sm" icon={<Pause size={14} />} onClick={() => onStatusChange("paused")}>Pause</Button>
          ) : null}
          {challenge.status !== "archived" && challenge.status !== "completed" && (
            <IconButton aria-label={`Archive ${challenge.name}`} title="Archive challenge" onClick={() => onStatusChange("archived")}><Archive size={16} /></IconButton>
          )}
          <IconButton aria-label={`Delete ${challenge.name}`} title="Delete challenge" onClick={onDelete}><Trash2 size={16} /></IconButton>
        </div>
      </div>

      <div className="challenge-progress-row">
        <div className="challenge-progress-numbers"><strong>{progress.daysCompleted}<span> / 30</span></strong><small>{progress.percentage}% overall</small></div>
        <ProgressBar value={progress.percentage} label={`${challenge.name} completion`} />
        <div className="challenge-streak"><strong>{progress.streak}</strong><small>day streak</small></div>
      </div>

      <div className="challenge-calendar-heading">
        <span>30-day calendar</span>
        <span>{formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}</span>
      </div>
      <div className="challenge-calendar" aria-label={`${challenge.name} 30-day calendar`}>
        {calendarDates.map((calendarDate, index) => {
          const future = calendarDate > today;
          const selected = calendarDate === selectedDate;
          const completed = completedDates.has(calendarDate);
          const current = calendarDate === today;
          return (
            <button
              type="button"
              key={calendarDate}
              className={`challenge-day${completed ? " challenge-day-complete" : ""}${current ? " challenge-day-today" : ""}${selected ? " challenge-day-selected" : ""}${future ? " challenge-day-future" : ""}`}
              onClick={() => setSelectedDate(calendarDate)}
              aria-label={`Day ${index + 1}, ${formatDate(calendarDate)}${completed ? ", complete" : ""}${future ? ", upcoming" : ""}`}
              aria-pressed={selected}
              title={`Day ${index + 1} - ${formatDate(calendarDate)}`}
            >
              {completed ? <Check size={13} strokeWidth={2.8} /> : <span>{String(index + 1).padStart(2, "0")}</span>}
            </button>
          );
        })}
      </div>

      <div className="challenge-review">
        <div className="challenge-review-label">
          <span>Day {dayNumber} review</span>
          <strong>{formatDate(selectedDate, { weekday: "long", year: "numeric" })}</strong>
          <small>{selectedRecord?.completed ? 100 : 0}% daily completion</small>
        </div>
        <div className="challenge-review-edit">
          <label className="form-field challenge-note-field">
            <span>What happened today?</span>
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} disabled={!canMark} placeholder="A short reflection is enough." />
          </label>
          <div className="challenge-review-actions">
            <Button size="sm" variant={selectedRecord?.completed ? "primary" : "secondary"} disabled={!canMark} onClick={toggleSelectedDay} icon={selectedRecord?.completed ? <Check size={14} /> : <CircleDot size={14} />}>
              {selectedRecord?.completed ? "Completed" : "Mark complete"}
            </Button>
            <Button size="sm" disabled={!canMark || savingNote} onClick={() => void saveNote()} icon={<RotateCcw size={13} />}>
              {savingNote ? "Saving..." : "Save note"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}