import { useMemo } from "react";
import { ArrowRight, BookOpenText, Check, ChevronRight, CircleCheck, Flame, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/Feedback";
import { useAppData } from "@/context/AppContext";
import { formatDate, formatLongDate, getThirtyDayRange, toDateKey } from "@/utils/dates";
import { getCurrentStreak, getDailyCounts } from "@/utils/progress";

export function DashboardPage() {
  const { activities, categories, dailyRecords, challenges, journalEntries, saveRecord } = useAppData();
  const today = toDateKey(new Date());
  const counts = getDailyCounts(activities, dailyRecords, today);
  const streak = getCurrentStreak(dailyRecords, today);
  const currentChallenges = challenges.filter((challenge) => challenge.status === "active");
  const todayRecords = new Map(dailyRecords.filter((record) => record.date === today).map((record) => [record.activityId, record]));
  const activeActivities = useMemo(() => activities.filter((activity) => activity.isActive), [activities]);
  const recentEntries = journalEntries.slice(0, 3);
  const calendarDays = getThirtyDayRange(today);

  const startProgress = counts.percentage;

  return (
    <>
      <header className="dashboard-heading">
        <div>
          <div className="eyebrow dashboard-eyebrow"><Sparkles size={13} /> A little better, every day</div>
          <h1>Today, in focus<span>.</span></h1>
          <p>{formatLongDate(today)}</p>
        </div>
        <Link className="button button-secondary button-md dashboard-journal-link" to="/journal">
          <BookOpenText size={15} /> Write in journal <ArrowRight size={14} />
        </Link>
      </header>

      <section className="dashboard-progress-summary" aria-label="Today's progress summary">
        <div className="progress-summary-primary">
          <div className="progress-orb" style={{ background: `conic-gradient(var(--accent) ${startProgress * 3.6}deg, var(--border-strong) 0deg)` }}>
            <div className="progress-orb-inner"><strong>{counts.percentage}<small>%</small></strong></div>
          </div>
          <div className="progress-summary-copy">
            <span className="eyebrow">Daily progress</span>
            <strong>{counts.completed} <span>/ {counts.total}</span></strong>
            <small>{counts.total ? "activities complete" : "activities planned"}</small>
          </div>
        </div>
        <div className="summary-metric"><span>Still to do</span><strong>{counts.pending}</strong><small>pending today</small></div>
        <div className="summary-metric"><span>In motion</span><strong>{currentChallenges.length}</strong><small>active challenges</small></div>
        <div className="summary-metric"><span>Consistency</span><strong>{streak}<Flame size={17} /></strong><small>{streak === 1 ? "day in a row" : "days in a row"}</small></div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-section today-section">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">One thing at a time</span>
              <h2>Today's activities <span>{counts.total}</span></h2>
            </div>
            <Link className="text-link" to="/tracker">Open tracker <ChevronRight size={14} /></Link>
          </div>
          {activeActivities.length === 0 ? (
            <EmptyState
              icon={<CircleCheck size={21} />}
              title="Your next step starts small"
              description="Add a daily activity and it will be ready here whenever you are."
              action={<Link className="button button-primary button-md" to="/activities"><Plus size={15} /> Add an activity</Link>}
            />
          ) : (
            <div className="dashboard-activity-list">
              {activeActivities.slice(0, 6).map((activity) => {
                const record = activity.id === undefined ? undefined : todayRecords.get(activity.id);
                const category = categories.find((item) => item.id === activity.categoryId);
                return (
                  <article className={`dashboard-activity-row${record?.completed ? " dashboard-activity-done" : ""}`} key={activity.id}>
                    <button
                      className={`completion-check${record?.completed ? " completion-check-active" : ""}`}
                      type="button"
                      aria-label={record?.completed ? `Mark ${activity.name} incomplete` : `Mark ${activity.name} complete`}
                      aria-pressed={Boolean(record?.completed)}
                      onClick={() => activity.id !== undefined && void saveRecord(today, activity.id, { completed: !record?.completed }).catch(() => undefined)}
                    >
                      {record?.completed && <Check size={14} strokeWidth={2.8} />}
                    </button>
                    <span className="category-mark" style={{ backgroundColor: category?.color ?? "var(--accent)" }} />
                    <div className="dashboard-activity-copy">
                      <strong>{activity.name}</strong>
                      <span>{category?.name ?? "Uncategorized"}</span>
                    </div>
                    <span className="dashboard-activity-time">{activity.estimatedMinutes} min</span>
                    <span className={`activity-state-text${record?.completed ? " state-text-done" : ""}`}>{record?.completed ? "Done" : "Pending"}</span>
                  </article>
                );
              })}
              {activeActivities.length > 6 && <Link className="more-activities-link" to="/tracker">View {activeActivities.length - 6} more activities <ArrowRight size={14} /></Link>}
            </div>
          )}
        </section>

        <div className="dashboard-side-column">
          <section className="dashboard-section calendar-section">
            <div className="section-heading-row compact-heading">
              <div><span className="eyebrow">Your rhythm</span><h2>Last 30 days</h2></div>
              <Link className="icon-link" to="/analytics" aria-label="Open progress analytics"><ChevronRight size={17} /></Link>
            </div>
            <div className="contribution-grid" aria-label="30 day activity calendar">
              {calendarDays.map((day) => {
                const completed = dailyRecords.filter((record) => record.date === day && record.completed).length;
                const total = dailyRecords.filter((record) => record.date === day).length;
                const level = !completed ? 0 : total > 0 && completed === total ? 4 : completed >= 3 ? 3 : completed === 2 ? 2 : 1;
                return (
                  <span
                    className={`contribution-day contribution-level-${level}${day === today ? " contribution-today" : ""}`}
                    key={day}
                    title={`${formatDate(day, { year: "numeric" })}: ${completed} completed${total ? ` of ${total} recorded` : ""}`}
                    aria-label={`${formatDate(day, { year: "numeric" })}: ${completed} completed activities`}
                  />
                );
              })}
            </div>
            <div className="calendar-legend"><span>Less</span><i className="contribution-level-0" /><i className="contribution-level-2" /><i className="contribution-level-4" /><span>More</span></div>
            <div className="calendar-caption"><span>{formatDate(calendarDays[0], { month: "short", day: "numeric" })}</span><span>Today</span></div>
          </section>

          <section className="dashboard-section journal-section">
            <div className="section-heading-row compact-heading">
              <div><span className="eyebrow">Pause and notice</span><h2>Recent reflections</h2></div>
              <Link className="icon-link" to="/journal" aria-label="Open journal"><ChevronRight size={17} /></Link>
            </div>
            {recentEntries.length ? (
              <div className="recent-journal-list">
                {recentEntries.map((entry) => (
                  <Link to="/journal" className="recent-journal-entry" key={entry.id ?? entry.date}>
                    <span>{formatDate(entry.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <strong>{entry.completedToday || entry.learnedToday || "A note to your future self"}</strong>
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="journal-empty-note">Your reflections will live here. A few honest lines are enough.</p>
            )}
          </section>
        </div>
      </div>

      <section className="dashboard-next-step">
        <div><span className="eyebrow">Keep the momentum</span><strong>{counts.total && counts.pending === 0 ? "You made room for everything today." : "Consistency is built one choice at a time."}</strong></div>
        <Link to="/challenges" className="text-link">Explore challenges <ChevronRight size={14} /></Link>
      </section>
    </>
  );
}