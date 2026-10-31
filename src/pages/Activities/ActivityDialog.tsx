import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Activity, Category, TargetUnit } from "@/types";

const activitySchema = z.object({
  name: z.string().trim().min(2, "Add a name with at least 2 characters.").max(80, "Keep the name under 80 characters."),
  categoryId: z.coerce.number().int().positive("Choose a category."),
  description: z.string().max(400, "Keep the description under 400 characters."),
  dailyTarget: z.coerce.number().int().min(1, "Target must be at least 1.").max(10000, "Target is too large."),
  targetUnit: z.enum(["sessions", "minutes", "pages", "repetitions", "custom"]),
  estimatedMinutes: z.coerce.number().int().min(0, "Estimated time cannot be negative.").max(1440, "Use a value under 24 hours."),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;

export function ActivityDialog({
  open,
  onClose,
  onSubmit,
  categories,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  categories: Category[];
  activity?: Activity;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<
    z.input<typeof activitySchema>,
    unknown,
    ActivityFormValues
  >({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      categoryId: categories[0]?.id ?? 0,
      description: "",
      dailyTarget: 1,
      targetUnit: "sessions",
      estimatedMinutes: 30,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(activity ? {
      name: activity.name,
      categoryId: activity.categoryId,
      description: activity.description,
      dailyTarget: activity.dailyTarget,
      targetUnit: activity.targetUnit,
      estimatedMinutes: activity.estimatedMinutes,
    } : {
      name: "",
      categoryId: categories[0]?.id ?? 0,
      description: "",
      dailyTarget: 1,
      targetUnit: "sessions",
      estimatedMinutes: 30,
    });
  }, [open, activity, categories, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // The shared page banner surfaces database errors.
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activity ? "Edit activity" : "Create an activity"}
      description="Give a repeatable action a clear place in your day."
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          <span>Activity name</span>
          <input autoFocus placeholder="e.g. Read one technical article" {...register("name")} />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>
        <label className="form-field">
          <span>Category</span>
          <select {...register("categoryId")}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {errors.categoryId && <small className="field-error">{errors.categoryId.message}</small>}
        </label>
        <label className="form-field">
          <span>Description <small>Optional</small></span>
          <textarea rows={3} placeholder="What does a good session look like?" {...register("description")} />
          {errors.description && <small className="field-error">{errors.description.message}</small>}
        </label>
        <div className="form-grid-two">
          <label className="form-field">
            <span>Daily target</span>
            <input type="number" min="1" {...register("dailyTarget")} />
            {errors.dailyTarget && <small className="field-error">{errors.dailyTarget.message}</small>}
          </label>
          <label className="form-field">
            <span>Target unit</span>
            <select {...register("targetUnit")}>
              {([
                ["sessions", "Sessions"],
                ["minutes", "Minutes"],
                ["pages", "Pages"],
                ["repetitions", "Repetitions"],
                ["custom", "Custom"],
              ] as [TargetUnit, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="form-field">
          <span>Estimated time <small>Minutes per day</small></span>
          <input type="number" min="0" {...register("estimatedMinutes")} />
          {errors.estimatedMinutes && <small className="field-error">{errors.estimatedMinutes.message}</small>}
        </label>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : activity ? "Save changes" : "Create activity"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}