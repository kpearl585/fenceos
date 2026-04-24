"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useState, useTransition, createContext, useContext } from "react";
import Link from "next/link";
import { updateJobStatus } from "@/app/dashboard/jobs/actions";

/**
 * Margin color thresholds are driven by the org's configured target.
 * Passed in as a prop from JobsPage and consumed via context inside the
 * leaf JobCard so we don't have to thread the values through 3 layers
 * of column/draggable wrappers. Default falls back to 30% / 25% if the
 * provider isn't used (safety for any ad-hoc render of the card).
 */
const MarginTargetsContext = createContext<{ target: number; warn: number }>({
  target: 0.30,
  warn: 0.25,
});

export type KanbanJob = {
  id: string;
  status: string;
  total_price: number | null;
  gross_margin_pct: number | null;
  scheduled_date: string | null;
  customerName: string;
  fenceType: string;
  linearFeet: number;
  foremanName: string;
  isOwner: boolean;
};

const ACTIVE_COLUMNS = [
  { id: "scheduled", label: "Scheduled", color: "bg-warning/10 border-warning/30" },
  { id: "active",    label: "Active",    color: "bg-accent/10 border-accent/30"   },
] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["active"],
  active:    ["complete"],
  complete:  [],
};

function fmt(v: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v ?? 0);
}
function fmtPct(v: number | null) {
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Job Card (display only)                                            */
/* ------------------------------------------------------------------ */
function JobCard({ job, dragHandleProps }: {
  job: KanbanJob;
  dragHandleProps?: Record<string, unknown>;
}) {
  const { target, warn } = useContext(MarginTargetsContext);
  const pct = Number(job.gross_margin_pct ?? 0);
  const marginColor =
    pct >= target ? "text-accent-light" : pct >= warn ? "text-warning" : "text-danger";
  return (
    <div className="bg-surface-2 rounded-lg border border-border shadow-sm hover:border-accent/40 hover:shadow-md transition-all duration-150">
      {/* Drag handle strip */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing border-b border-border rounded-t-lg bg-surface-3 hover:bg-surface-2 transition-colors duration-150"
          title="Drag to change status"
        >
          <div className="flex gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-0.5 h-3 bg-muted rounded" />
            ))}
          </div>
        </div>
      )}

      {/* Card body */}
      <Link href={`/dashboard/jobs/${job.id}`} className="block p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-text text-sm truncate">{job.customerName}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{job.fenceType} · {job.linearFeet} ft</p>
            {job.foremanName !== "Unassigned" && (
              <p className="text-xs text-muted mt-0.5">{job.foremanName}</p>
            )}
            <p className="text-xs text-muted mt-0.5">
              {job.scheduled_date
                ? new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Not scheduled"}
            </p>
          </div>
          {job.isOwner && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-text">{fmt(job.total_price)}</p>
              <p className={`text-xs font-semibold mt-0.5 ${marginColor}`}>
                {fmtPct(job.gross_margin_pct)}
              </p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Draggable card wrapper — uses useDraggable (not useSortable)      */
/* ------------------------------------------------------------------ */
function DraggableJobCard({ job }: { job: KanbanJob }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: "relative",
      }}
    >
      <JobCard job={job} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drop column                                                        */
/* ------------------------------------------------------------------ */
function KanbanColumn({ column, jobs }: { column: typeof ACTIVE_COLUMNS[number]; jobs: KanbanJob[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`rounded-xl border-2 ${column.color} ${isOver ? "ring-2 ring-accent" : ""} p-3 flex flex-col min-h-96 transition-all duration-150`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-text uppercase tracking-wider">{column.label}</h3>
        <span className="bg-surface-2 text-muted text-xs font-semibold px-2 py-0.5 rounded-full border border-border">{jobs.length}</span>
      </div>
      <div ref={setNodeRef} className="space-y-2 flex-1 min-h-16">
        {jobs.length === 0
          ? <p className="text-xs text-muted text-center py-8 border-2 border-dashed border-border rounded-lg">Drop here</p>
          : jobs.map((job) => <DraggableJobCard key={job.id} job={job} />)
        }
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completed Jobs History Table                                       */
/* ------------------------------------------------------------------ */
function CompletedHistory({ jobs, isOwner }: { jobs: KanbanJob[]; isOwner: boolean }) {
  const { target, warn } = useContext(MarginTargetsContext);
  const [show, setShow] = useState(false);
  if (jobs.length === 0) return null;

  return (
    <div className="mt-6 border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setShow((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-3 hover:bg-surface-2 transition-colors duration-150 text-left"
      >
        <span className="text-sm font-semibold text-text uppercase tracking-wider">
          Completed Jobs
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-accent/15 text-accent-light text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">{jobs.length}</span>
          <span className="text-muted text-xs">{show ? "Hide" : "Show"}</span>
        </span>
      </button>

      {show && (
        <div className="divide-y divide-border">
          {jobs.map((job) => (
            <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors duration-150">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{job.customerName}</p>
                <p className="text-xs text-muted">{job.fenceType} · {job.linearFeet} ft
                  {job.scheduled_date && ` · ${new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </p>
              </div>
              {isOwner && (
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-text">{fmt(job.total_price)}</p>
                  <p className={`text-xs font-semibold ${(() => {
                    const p = Number(job.gross_margin_pct ?? 0);
                    return p >= target ? "text-accent-light" : p >= warn ? "text-warning" : "text-danger";
                  })()}`}>
                    {fmtPct(job.gross_margin_pct)}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board                                                              */
/* ------------------------------------------------------------------ */
export default function JobKanban({
  jobs: initialJobs,
  targetMargin = 0.30,
  warnMargin = 0.25,
}: {
  jobs: KanbanJob[];
  targetMargin?: number;
  warnMargin?: number;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeJob, setActiveJob] = useState<KanbanJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const isOwner = initialJobs.some((j) => j.isOwner);
  const activeJobs = jobs.filter((j) => j.status === "scheduled" || j.status === "active");
  const completedJobs = jobs.filter((j) => j.status === "complete");
  const cancelledJobs = jobs.filter((j) => j.status === "cancelled");

  function handleDragStart(event: DragStartEvent) {
    setActiveJob(jobs.find((j) => j.id === event.active.id) ?? null);
    setError(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    const draggedId = active.id as string;
    const fromStatus = jobs.find((j) => j.id === draggedId)?.status;
    const toStatus = ACTIVE_COLUMNS.find((c) => c.id === over.id)?.id;

    if (!toStatus || fromStatus === toStatus) return;

    const allowed = VALID_TRANSITIONS[fromStatus ?? ""] ?? [];
    if (!allowed.includes(toStatus)) {
      setError(`Cannot move ${fromStatus} to ${toStatus}.`);
      return;
    }

    const prevStatus = fromStatus;
    setJobs((prev) => prev.map((j) => j.id === draggedId ? { ...j, status: toStatus } : j));

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("jobId", draggedId);
        fd.set("status", toStatus);
        await updateJobStatus(fd);
      } catch {
        setJobs((prev) => prev.map((j) => j.id === draggedId ? { ...j, status: prevStatus! } : j));
        setError("Failed to save status. Please try again.");
      }
    });
  }

  return (
    <MarginTargetsContext.Provider value={{ target: targetMargin, warn: warnMargin }}>
    <div>
      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold text-lg leading-none">x</button>
        </div>
      )}
      {isPending && <p className="mb-3 text-xs text-muted text-center animate-pulse">Saving...</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTIVE_COLUMNS.map((col) => (
            <KanbanColumn key={col.id} column={col} jobs={activeJobs.filter((j) => j.status === col.id)} />
          ))}
        </div>
        <DragOverlay>
          {activeJob ? <JobCard job={activeJob} /> : null}
        </DragOverlay>
      </DndContext>

      <CompletedHistory jobs={completedJobs} isOwner={isOwner} />

      {cancelledJobs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Cancelled</h3>
          <div className="space-y-2">
            {cancelledJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      )}
    </div>
    </MarginTargetsContext.Provider>
  );
}
