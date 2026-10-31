import { useMemo } from "react";
import { BarChart3, CalendarRange, ChartNoAxesCombined, Check, CircleDot, Flame } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppData } from "@/context/AppContext";
import { formatDate, getCurrentWeekDateKeys, getRecentDateKeys, toDateKey } from "@/utils/dates";
import { getActivityAgeInDays, getActivityCreatedDateKey, getActivityDailyRate, getChallengeProgress, getCurrentStreak } from "@/utils/progress";

const chartGridColor = "var(--border)";
const chartLabelColor = "var(--muted)";

export function AnalyticsPage() {
  const { activities, dailyRecords, categories, challenges, challengeRecords, settings } = useAppData();
  const today = toDateKey(new Date());

  const rates = useMemo(() => {
    const days = getRecentDateKeys(30, today);
    return days.map((date) => ({
      date,
      label: formatDate(date, { month: "short", day: "numeric" }),
      rate: getActivityDailyRate(activities, dailyRecords, date),
    }));
  }, [activities, dailyRecords, today]);
  const weekDates = getCurrentWeekDateKeys(today, settings[0]?.weekStartsOn ?? "monday");
  const weeklyData = weekDates.map((date) => ({
    date,
    label: formatDate(date, { weekday: "short" }),
    rate: getActivityDailyRate(activities, dailyRecords, date),
  }));
  const weekAverage = average(weeklyData.map((item) => item.rate));
  const monthAverage = average(rates.map((item) => item.rate));
  const todayRate = getActivityDailyRate(activities, dailyRecords, today);
  const streak = getCurrentStreak(dailyRecords, today);
  const monthStart = rates[0]?.date ?? today;
  const todayProgress = useMemo(() => {
    const activeActivities = activities.filter((activity) => activity.isActive);
    const completedIds = new Set(dailyRecords.filter((record) => record.date === today && record.completed).map((record) => record.activityId));
    const completed = activeActivities.filter((activity) => activity.id !== undefined && completedIds.has(activity.id)).length;
    return { completed, pending: Math.max(0, activeActivities.length - completed) };
  }, [activities, dailyRecords, today]);

  const categoryPerformance = useMemo(() => categories.map((category) => {
    const categoryActivities = activities.filter((activity) => activity.categoryId === category.id);
    const eligibleActivities = categoryActivities.filter((activity) => getActivityCreatedDateKey(activity) <= today);
    const expected = eligibleActivities.reduce((sum, activity) => sum + getActivityAgeInDays(activity, today), 0);
    const totalCompletedDays = dailyRecords.filter((record) =>
      record.completed && record.date >= monthStart && record.date <= today &&
      categoryActivities.some((activity) => activity.id === record.activityId),
    ).length;
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      activityCount: categoryActivities.length,
      percentage: expected ? Math.min(100, Math.round((totalCompletedDays / expected) * 100)) : 0,
    };
  }).filter((category) => category.activityCount > 0), [categories, activities, dailyRecords, today, monthStart]);

  const monthlyData = rates.filter((_, index) => index % 2 === 0 || index === rates.length - 1);
  const completionSplit = [
    { name: "Completed", value: todayProgress.completed, color: "var(--accent)" },
    { name: "Pending", value: todayProgress.pending, color: "var(--border-strong)" },
  ];
  const challengeHistory = challenges.filter((challenge) => challenge.status === "completed" || challenge.status === "archived");

  return (
    <>
      <PageHeader
        eyebrow="Progress, not perfection"
        title="Analytics"
        description="Look for patterns, celebrate consistency, and adjust what is not working."
      />

      {activities.length === 0 ? (
        <EmptyState
          icon={<ChartNoAxesCombined size={21} />}
          title="Your first data point starts with an activity"
          description="Once you create activities and track a few days, meaningful trends will appear here."
        />
      ) : (
        <>
          <section className="analytics-overview" aria-label="Performance overview">
            <div className="analytics-overview-item"><span>Today</span><strong>{todayRate}<small>%</small></strong><small>completion rate</small></div>
            <div className="analytics-overview-item"><span>This week</span><strong>{weekAverage}<small>%</small></strong><small>average completion</small></div>
            <div className="analytics-overview-item"><span>Last 30 days</span><strong>{monthAverage}<small>%</small></strong><small>average completion</small></div>
            <div className="analytics-overview-item"><span>Consistency</span><strong>{streak}<Flame size={17} /></strong><small>current day streak</small></div>
          </section>

          <div className="analytics-chart-grid">
            <section className="chart-panel chart-panel-wide">
              <div className="chart-heading">
                <div><span className="eyebrow"><ChartNoAxesCombined size={13} /> Consistency trend</span><h2>Daily completion rate</h2></div>
                <span className="chart-period-label">Last 30 days</span>
              </div>
              <div className="chart-canvas chart-canvas-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rates} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="completion-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--text)" }} formatter={(value) => [`${value}%`, "Completion"]} />
                    <Area type="monotone" dataKey="rate" stroke="var(--accent)" strokeWidth={2} fill="url(#completion-fill)" activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-panel">
              <div className="chart-heading">
                <div><span className="eyebrow"><CalendarRange size={13} /> This week</span><h2>Daily performance</h2></div>
                <span className="chart-period-label">{weekAverage}% average</span>
              </div>
              <div className="chart-canvas chart-canvas-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 12, right: 2, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--text)" }} formatter={(value) => [`${value}%`, "Completion"]} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={29}>
                      {weeklyData.map((item) => <Cell key={item.date} fill={item.date === today ? "var(--accent)" : "var(--chart-muted)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-panel">
              <div className="chart-heading">
                <div><span className="eyebrow"><BarChart3 size={13} /> Monthly view</span><h2>Thirty-day rhythm</h2></div>
                <span className="chart-period-label">{monthAverage}% average</span>
              </div>
              <div className="chart-canvas chart-canvas-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 12, right: 2, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartLabelColor, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--text)" }} formatter={(value) => [`${value}%`, "Completion"]} />
                    <Bar dataKey="rate" fill="var(--chart-muted)" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-panel">
              <div className="chart-heading">
                <div><span className="eyebrow">Today, at a glance</span><h2>Completed vs pending</h2></div>
                <span className="chart-period-label">{todayProgress.completed + todayProgress.pending} activities</span>
              </div>
              {todayProgress.completed + todayProgress.pending ? (
                <div className="completion-split-layout">
                  <div className="pie-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={completionSplit} dataKey="value" nameKey="name" innerRadius={54} outerRadius={72} paddingAngle={3} stroke="none">
                          {completionSplit.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center"><strong>{todayProgress.completed}</strong><span>done today</span></div>
                  </div>
                  <div className="completion-split-legend">
                    <div><span className="legend-dot legend-dot-complete" /><span>Completed</span><strong>{todayProgress.completed}</strong></div>
                    <div><span className="legend-dot legend-dot-pending" /><span>Pending</span><strong>{todayProgress.pending}</strong></div>
                  </div>
                </div>
              ) : <p className="chart-empty-copy">No activities are scheduled today.</p>}
            </section>

            <section className="chart-panel">
              <div className="chart-heading"><div><span className="eyebrow">Where your time goes</span><h2>By category</h2></div></div>
              {categoryPerformance.length ? (
                <div className="category-performance-list">
                  {categoryPerformance.map((category) => (
                    <div className="category-performance-row" key={category.id}>
                      <div className="category-performance-title"><span className="category-mark" style={{ backgroundColor: category.color }} /><span>{category.name}</span><small>{category.activityCount} {category.activityCount === 1 ? "activity" : "activities"}</small></div>
                      <div className="category-performance-progress"><ProgressBar value={category.percentage} label={`${category.name} completion`} /><strong>{category.percentage}%</strong></div>
                    </div>
                  ))}
                </div>
              ) : <p className="chart-empty-copy">Add activities to see how your practice is distributed.</p>}
            </section>

            <section className="chart-panel">
              <div className="chart-heading"><div><span className="eyebrow">Milestones</span><h2>Challenge history</h2></div></div>
              {challengeHistory.length ? (
                <div className="analytics-challenge-list">
                  {challengeHistory.slice(0, 5).map((challenge) => {
                    const progress = getChallengeProgress(challenge, challengeRecords);
                    return (
                      <div className="analytics-challenge-row" key={challenge.id}>
                        <span className={`analytics-challenge-icon${challenge.status === "completed" ? " analytics-challenge-done" : ""}`}>{challenge.status === "completed" ? <Check size={14} /> : <CircleDot size={14} />}</span>
                        <div><strong>{challenge.name}</strong><span>{challenge.status === "completed" ? "Completed challenge" : "Archived challenge"}</span></div>
                        <strong>{progress.daysCompleted}<small>/30</small></strong>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="chart-empty-copy">Completed and archived challenges will be kept here.</p>}
            </section>
          </div>
          <p className="analytics-method-note">Rates compare completed activities with activities created by that date. Only your saved records are used; no progress is pre-filled.</p>
        </>
      )}
    </>
  );
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

const tooltipStyle = {
  backgroundColor: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 12,
};