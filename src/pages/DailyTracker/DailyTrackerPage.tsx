import { useMemo, useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, MessageSquareText, Plus, Save, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppData } from "@/context/AppContext";
import { addDays, formatDate, formatLongDate, toDateKey } from "@/utils/dates";
import { getDailyCounts } from "@/utils/progress";
import type { Activity, DailyRecord } from "@/types";

export function DailyTrackerPage() {
  const { activities, categories, dailyRecords, settings, saveRecord } = useAppData();
  const [date, setDate] = useState(toDateKey(new Date()));
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const today = toDateKey(new Date());

  const counts = getDailyCounts(activities, dailyRecords, date);
  const visibleActivities = useMemo(() => activities
    .filter((activity) => activity.isActive)
    .filter((activity) => !settings[0]?.hideCompletedActivities || !dailyRecords.some((record) =>
      record.date === date && record.activityId === activity.id && record.completed)),
  [activities, dailyRecords, date, settings]);

  const changeDate = (amount: number) => setDate((current) => addDays(current, amount));

  return (
    <>
      <PageHeader
        eyebrow="Show up, then keep going"
        title="Daily tracker"
        description="A clear view of what you planned and what you actually did."
        action={<Link className="button button-secondary button-md" to="/activities"><SlidersHorizontal size={15} /> Manage activities</Link>}
      />

      <section className="tracker-date-bar" aria-label="Choose a tracking date">
        <div className="date-stepper">
          <IconButton aria-label="Previous day" onClick={() => changeDate(-1)}><ChevronLeft size={18} /></IconButton>
          <label className="date-picker-label">
            <span>{date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : formatDate(date, { year: "numeric" })}</span>
            <input aria-label="Selected date" type="date" max={today} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
          </label>
          <IconButton aria-label="Next day" disabled={date >= today} onClick={() => changeDate(1)}><ChevronRight size={18} /></IconButton>
        </div>
        <span className="date-long-label">{formatLongDate(date)}</span>
        <div className="tracker-counts"><strong>{counts.completed}</strong> of {counts.total} complete</div>
      </section>

      <div className="tracker-progress-line">
        <ProgressBar value={counts.percentage} label="Daily completion" />
        <span>{counts.percentage}%</span>
      </div>

      {activities.filter((activity) => activity.isActive).length === 0 ? (
        <EmptyState
          icon={<Check size={21} />}
          title="Your tracker is ready when you are"
          description="Create a few activities first. They will appear here each day, ready to check off."
          action={<Link className="button button-primary button-md" to="/activities"><Plus size={15} /> Add activities</Link>}
        />
      ) : visibleActivities.length === 0 ? (
        <EmptyState
          icon={<Check size={21} />}
          title="Everything is complete"
          description="Completed activities are hidden by your settings. You can show them again in Settings."
        />
      ) : (
        <section className="tracker-list" aria-label="Activities for this day">
          {visibleActivities.map((activity) => {
            const record = dailyRecords.find((item) => item.date === date && item.activityId === activity.id);
            const category = categories.find((item) => item.id === activity.categoryId);
            return (
              <TrackerActivityRow
                key={activity.id}
                activity={activity}
                record={record}
                categoryName={category?.name ?? "Uncategorized"}
                categoryColor={category?.color ?? "var(--accent)"}
                expanded={expandedActivity === activity.id}
                onExpand={() => setExpandedActivity((current) => current === activity.id ? null : activity.id ?? null)}
                onToggle={() => activity.id !== undefined && void saveRecord(date, activity.id, { completed: !record?.completed }).catch(() => undefined)}
                onSave={(changes) => activity.id !== undefined ? saveRecord(date, activity.id, changes) : Promise.resolve()}
              />
            );
          })}
        </section>
      )}
      <p className="tracker-footnote">Past days remain editable. Future dates are read-only until they arrive.</p>
    </>
  );
}

function TrackerActivityRow({
  activity,
  record,
  categoryName,
  categoryColor,
  expanded,
  onExpand,
  onToggle,
  onSave,
}: {
  activity: Activity;
  record?: DailyRecord;
  categoryName: string;
  categoryColor: string;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onSave: (changes: Partial<Pick<DailyRecord, "timeSpentMinutes" | "notes" | "referenceLinks">>) => Promise<void>;
}) {
  const [timeSpent, setTimeSpent] = useState(record?.timeSpentMinutes ?? 0);
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [linksText, setLinksText] = useState(record?.referenceLinks.join("\n") ?? "");
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    setTimeSpent(record?.timeSpentMinutes ?? 0);
    setNotes(record?.notes ?? "");
    setLinksText(record?.referenceLinks.join("\n") ?? "");
  }, [record]);

  const handleSave = async () => {
    const referenceLinks = linksText.split("\n").map((link) => link.trim()).filter(Boolean);
    if (referenceLinks.some((link) => {
      try {
        const url = new URL(link);
        return url.protocol !== "http:" && url.protocol !== "https:";
      } catch {
        return true;
      }
    })) {
      setLinkError("Use a complete http:// or https:// URL for each reference.");
      return;
    }
    setLinkError("");
    setSaving(true);
    try {
      await onSave({
        timeSpentMinutes: Math.min(1440, Math.max(0, Number(timeSpent) || 0)),
        notes,
        referenceLinks,
      });
    } catch {
      // The shared page banner surfaces persistence errors.
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`tracker-activity${record?.completed ? " tracker-activity-complete" : ""}`}>
      <button
        type="button"
        className={`completion-check${record?.completed ? " completion-check-active" : ""}`}
        aria-label={record?.completed ? `Mark ${activity.name} incomplete` : `Mark ${activity.name} complete`}
        aria-pressed={Boolean(record?.completed)}
        onClick={onToggle}
      >
        {record?.completed && <Check size={14} strokeWidth={2.8} />}
      </button>
      <span className="category-mark" style={{ backgroundColor: categoryColor }} />
      <div className="tracker-activity-main">
        <div className="tracker-activity-title-line">
          <h2>{activity.name}</h2>
          <span className="tracker-status">{record?.completed ? "Completed" : "Pending"}</span>
        </div>
        <p>{activity.description || categoryName}</p>
      </div>
      <div className="tracker-activity-target">
        <span>{activity.dailyTarget} {activity.targetUnit}</span>
        <span>{activity.estimatedMinutes} min est.</span>
      </div>
      <Button className="tracker-detail-button" size="sm" icon={<MessageSquareText size={15} />} onClick={onExpand}>
        {expanded ? "Close details" : record?.notes || record?.referenceLinks.length ? "View notes" : "Add details"}
      </Button>
      {expanded && (
        <div className="tracker-detail-panel">
          <label className="form-field">
            <span>Time spent <small>Minutes</small></span>
            <input type="number" min="0" max="1440" value={timeSpent} onChange={(event) => setTimeSpent(Number(event.target.value))} />
          </label>
          <label className="form-field">
            <span>Personal notes</span>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A quick note about this session" />
          </label>
          <label className="form-field">
            <span>Reference links <small>One URL per line</small></span>
            <textarea rows={2} value={linksText} onChange={(event) => setLinksText(event.target.value)} placeholder="https://example.com/resource" />
            {linkError && <small className="field-error">{linkError}</small>}
          </label>
          <Button size="sm" variant="primary" icon={<Save size={14} />} disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving..." : "Save details"}
          </Button>
          {record?.referenceLinks.find((link) => /^https?:\/\//i.test(link)) && (
            <a className="record-reference-link" href={record.referenceLinks.find((link) => /^https?:\/\//i.test(link))} target="_blank" rel="noreferrer">
              Open saved reference <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </article>
  );
}