import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BookOpenText, ChevronLeft, ChevronRight, Clock3, Save } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppData } from "@/context/AppContext";
import { addDays, formatDate, formatLongDate, toDateKey } from "@/utils/dates";

const journalSchema = z.object({
  completedToday: z.string().max(3000, "Keep this entry under 3,000 characters."),
  learnedToday: z.string().max(3000, "Keep this entry under 3,000 characters."),
  mistakesToday: z.string().max(3000, "Keep this entry under 3,000 characters."),
  improveTomorrow: z.string().max(3000, "Keep this entry under 3,000 characters."),
  prioritiesTomorrow: z.string().max(3000, "Keep this entry under 3,000 characters."),
}).refine((entry) => Object.values(entry).some((value) => value.trim().length > 0), {
  message: "Add a thought before saving this journal entry.",
  path: ["completedToday"],
});

type JournalFormValues = z.infer<typeof journalSchema>;
const blankEntry: JournalFormValues = {
  completedToday: "",
  learnedToday: "",
  mistakesToday: "",
  improveTomorrow: "",
  prioritiesTomorrow: "",
};

const journalFields: { name: keyof JournalFormValues; label: string; prompt: string }[] = [
  { name: "completedToday", label: "What did I complete today?", prompt: "Notice what moved forward, even if it was small." },
  { name: "learnedToday", label: "What did I learn today?", prompt: "A new idea, a better approach, or something about yourself." },
  { name: "mistakesToday", label: "What mistakes did I make?", prompt: "Be curious, not critical. What would you do differently?" },
  { name: "improveTomorrow", label: "What should I improve tomorrow?", prompt: "Choose one practical adjustment for the next day." },
  { name: "prioritiesTomorrow", label: "Tomorrow's priorities", prompt: "Write down the few things that deserve your attention." },
];

export function JournalPage() {
  const { journalEntries, saveJournal } = useAppData();
  const [date, setDate] = useState(toDateKey(new Date()));
  const entry = useMemo(() => journalEntries.find((item) => item.date === date), [journalEntries, date]);
  const today = toDateKey(new Date());
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: blankEntry,
  });

  useEffect(() => {
    reset(entry ? {
      completedToday: entry.completedToday,
      learnedToday: entry.learnedToday,
      mistakesToday: entry.mistakesToday,
      improveTomorrow: entry.improveTomorrow,
      prioritiesTomorrow: entry.prioritiesTomorrow,
    } : blankEntry);
  }, [entry, date, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await saveJournal({ date, ...values });
    } catch {
      // Persistence errors are displayed in the shared page banner.
    }
  });

  const handleSelectEntry = (selectedDate: string) => setDate(selectedDate);

  return (
    <>
      <PageHeader
        eyebrow="Make the day mean something"
        title="Daily journal"
        description="A private place to notice, learn, and choose what comes next."
      />

      <div className="journal-layout">
        <main className="journal-editor">
          <div className="journal-date-toolbar">
            <div className="date-stepper">
              <IconButton aria-label="Previous day" onClick={() => setDate((current) => addDays(current, -1))}><ChevronLeft size={18} /></IconButton>
              <label className="date-picker-label">
                <span>{date === today ? "Today" : formatDate(date, { year: "numeric" })}</span>
                <input type="date" aria-label="Journal date" max={today} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
              </label>
              <IconButton aria-label="Next day" disabled={date >= today} onClick={() => setDate((current) => addDays(current, 1))}><ChevronRight size={18} /></IconButton>
            </div>
            <span className="journal-date-long">{formatLongDate(date)}</span>
          </div>

          <form className="journal-form" onSubmit={submit}>
            {journalFields.map((field, index) => (
              <label className={`journal-field${index === 0 ? " journal-field-first" : ""}`} key={field.name}>
                <span className="journal-field-heading"><span className="journal-field-number">0{index + 1}</span><strong>{field.label}</strong></span>
                <textarea rows={index === 4 ? 3 : 4} placeholder={field.prompt} {...register(field.name)} />
                {errors[field.name] && <small className="field-error">{errors[field.name]?.message}</small>}
              </label>
            ))}
            <div className="journal-form-footer">
              <span>{entry ? `Last saved ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(entry.updatedAt))}` : "Entries are saved only when you choose to save."}</span>
              <Button variant="primary" type="submit" icon={<Save size={15} />} disabled={isSubmitting || (!isDirty && Boolean(entry))}>
                {isSubmitting ? "Saving..." : entry ? "Save changes" : "Save entry"}
              </Button>
            </div>
          </form>
        </main>

        <aside className="journal-history">
          <div className="journal-history-heading">
            <div><span className="eyebrow">Your past notes</span><h2>Journal history</h2></div>
            <span className="journal-history-count">{journalEntries.length}</span>
          </div>
          {journalEntries.length ? (
            <div className="journal-entry-list">
              {journalEntries.map((journalEntry) => (
                <button
                  key={journalEntry.id ?? journalEntry.date}
                  className={`journal-entry-link${date === journalEntry.date ? " journal-entry-selected" : ""}`}
                  type="button"
                  onClick={() => handleSelectEntry(journalEntry.date)}
                >
                  <span className="journal-entry-date"><Clock3 size={13} /> {formatDate(journalEntry.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                  <strong>{journalEntry.completedToday || journalEntry.learnedToday || "Daily reflection"}</strong>
                  <span>{journalEntry.prioritiesTomorrow || journalEntry.improveTomorrow || "No priorities added"}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpenText size={20} />}
              title="Nothing written yet"
              description="Saved reflections will be easy to find here."
            />
          )}
        </aside>
      </div>
    </>
  );
}