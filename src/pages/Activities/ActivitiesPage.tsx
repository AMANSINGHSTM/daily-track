import { useMemo, useState, type FormEvent } from "react";
import { Activity as ActivityIcon, Archive, Check, CirclePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppData } from "@/context/AppContext";
import { ActivityDialog, type ActivityFormValues } from "@/pages/Activities/ActivityDialog";
import type { Activity } from "@/types";

type ActivityFilter = "active" | "inactive" | "all";

export function ActivitiesPage() {
  const { activities, categories, addActivity, editActivity, removeActivity, addCategory } = useAppData();
  const [filter, setFilter] = useState<ActivityFilter>("active");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [deletingActivity, setDeletingActivity] = useState<Activity | undefined>();
  const [categoryName, setCategoryName] = useState("");

  const visibleActivities = useMemo(() => activities.filter((activity) => {
    const matchesFilter = filter === "all" || activity.isActive === (filter === "active");
    const matchesSearch = `${activity.name} ${activity.description}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [activities, filter, search]);

  const openCreate = () => {
    setEditingActivity(undefined);
    setDialogOpen(true);
  };

  const handleSave = async (values: ActivityFormValues) => {
    if (editingActivity?.id !== undefined) {
      await editActivity(editingActivity.id, values);
      return;
    }
    await addActivity(values);
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await addCategory(categoryName);
      setCategoryName("");
    } catch {
      // The shared page banner surfaces validation and persistence errors.
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Your building blocks"
        title="Activities"
        description="Shape the small actions that make your days add up."
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>New activity</Button>}
      />

      <section className="activity-management">
        <div className="section-toolbar">
          <div className="segmented-control" aria-label="Filter activities">
            {(["active", "inactive", "all"] as ActivityFilter[]).map((value) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "segment-active" : ""}
                onClick={() => setFilter(value)}
              >
                {value === "active" ? "Active" : value === "inactive" ? "Paused" : "All"}
                <span>{activities.filter((activity) => value === "all" || activity.isActive === (value === "active")).length}</span>
              </button>
            ))}
          </div>
          <label className="search-control">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an activity" aria-label="Find an activity" />
          </label>
        </div>

        {visibleActivities.length > 0 ? (
          <div className="activity-list" role="list">
            {visibleActivities.map((activity) => {
              const category = categories.find((item) => item.id === activity.categoryId);
              return (
                <article className="activity-management-row" role="listitem" key={activity.id}>
                  <span className="category-mark" style={{ backgroundColor: category?.color ?? "var(--accent)" }} />
                  <div className="activity-management-copy">
                    <div className="activity-management-title">
                      <h2>{activity.name}</h2>
                      {!activity.isActive && <span className="status-label">Paused</span>}
                    </div>
                    <p>{activity.description || category?.name || "No description added"}</p>
                  </div>
                  <div className="activity-management-meta">
                    <span>{category?.name ?? "Uncategorized"}</span>
                    <span>{activity.dailyTarget} {activity.targetUnit} / day</span>
                    <span>{activity.estimatedMinutes} min</span>
                  </div>
                  <div className="row-actions">
                    <IconButton
                      aria-label={activity.isActive ? `Pause ${activity.name}` : `Activate ${activity.name}`}
                      title={activity.isActive ? "Pause activity" : "Activate activity"}
                      onClick={() => activity.id !== undefined && void editActivity(activity.id, { isActive: !activity.isActive }).catch(() => undefined)}
                    >
                      {activity.isActive ? <Archive size={16} /> : <Check size={16} />}
                    </IconButton>
                    <IconButton aria-label={`Edit ${activity.name}`} onClick={() => { setEditingActivity(activity); setDialogOpen(true); }}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton aria-label={`Delete ${activity.name}`} onClick={() => setDeletingActivity(activity)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ActivityIcon size={21} />}
            title={search ? "No matching activities" : filter === "active" ? "Start with one small action" : "Nothing to show here"}
            description={search ? "Try a different search term." : "Create a repeatable action and it will appear in your daily tracker."}
            action={!search && filter !== "inactive" ? <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Create your first activity</Button> : undefined}
          />
        )}
      </section>

      <section className="category-management">
        <div className="category-management-heading">
          <div>
            <span className="eyebrow">Organize your practice</span>
            <h2>Categories</h2>
          </div>
          <span className="muted-copy">{categories.length} available</span>
        </div>
        <div className="category-chip-list">
          {categories.map((category) => (
            <span className="category-chip" key={category.id}>
              <span className="category-mark" style={{ backgroundColor: category.color }} />
              {category.name}
              {category.isCustom && <small>Custom</small>}
            </span>
          ))}
        </div>
        <form className="add-category-form" onSubmit={(event) => void handleCategorySubmit(event)}>
          <label className="visually-hidden" htmlFor="new-category">New category name</label>
          <input
            id="new-category"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Add a custom category"
            maxLength={48}
          />
          <Button size="sm" icon={<CirclePlus size={15} />} disabled={!categoryName.trim()}>Add category</Button>
        </form>
      </section>

      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        categories={categories}
        activity={editingActivity}
      />
      <ConfirmDialog
        open={Boolean(deletingActivity)}
        title="Delete this activity?"
        description="Its daily completion records will also be removed. This cannot be undone."
        onCancel={() => setDeletingActivity(undefined)}
        onConfirm={() => {
          if (deletingActivity?.id !== undefined) void removeActivity(deletingActivity.id).catch(() => undefined);
          setDeletingActivity(undefined);
        }}
      />
    </>
  );
}