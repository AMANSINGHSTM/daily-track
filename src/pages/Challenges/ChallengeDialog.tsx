import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/types";
import { toDateKey } from "@/utils/dates";

const challengeSchema = z.object({
  name: z.string().trim().min(2, "Add a challenge name.").max(80, "Keep the name under 80 characters."),
  categoryId: z.coerce.number().int().positive("Choose a category."),
  description: z.string().max(300, "Keep the description under 300 characters."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
});

export type ChallengeFormValues = z.infer<typeof challengeSchema>;

export function ChallengeDialog({
  open,
  onClose,
  onSubmit,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ChallengeFormValues) => Promise<void>;
  categories: Category[];
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<
    z.input<typeof challengeSchema>,
    unknown,
    ChallengeFormValues
  >({
    resolver: zodResolver(challengeSchema),
    defaultValues: { name: "", categoryId: categories[0]?.id ?? 0, description: "", startDate: toDateKey(new Date()) },
  });

  useEffect(() => {
    if (open) reset({ name: "", categoryId: categories[0]?.id ?? 0, description: "", startDate: toDateKey(new Date()) });
  }, [open, categories, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // The application context surfaces persistence errors in the page banner.
    }
  });

  return (
    <Modal open={open} onClose={onClose} title="Start a 30-day challenge" description="Choose one area to practice with intention for the next month.">
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          <span>Challenge name</span>
          <input autoFocus placeholder="e.g. Speak English out loud" {...register("name")} />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>
        <label className="form-field">
          <span>Category</span>
          <select {...register("categoryId")}>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
          {errors.categoryId && <small className="field-error">{errors.categoryId.message}</small>}
        </label>
        <label className="form-field">
          <span>What does success look like? <small>Optional</small></span>
          <textarea rows={3} placeholder="A short intention for these 30 days" {...register("description")} />
          {errors.description && <small className="field-error">{errors.description.message}</small>}
        </label>
        <label className="form-field">
          <span>Start date</span>
          <input type="date" {...register("startDate")} />
          {errors.startDate && <small className="field-error">{errors.startDate.message}</small>}
        </label>
        <p className="form-hint">The challenge runs for 30 consecutive calendar days from your selected start date.</p>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Starting..." : "Start challenge"}</Button>
        </div>
      </form>
    </Modal>
  );
}