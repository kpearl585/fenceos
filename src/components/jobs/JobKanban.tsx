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
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";
import Link from "next/link";
import { updateJobStatus } from "@/app/dashboard/jobs/actions";

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

const COLUMNS = [
  { id: "scheduled", label: "Scheduled", color: "bg-yellow-50 border-yellow-200" },
  { id: "active",    label: "Active",    color: "bg-blue-50 border-blue-200"   },
  { id: "complete",  label: "Complete",  color: "bg-green-50 border-green-200" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-700",
  active:    "bg-blue-100 text-blue-700",
  complete:  "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

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

function JobCard({ job, isDragging }: { job: KanbanJob; isDragging?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm transition-all ${isDragging ? "opacity-50" : "hover:border-fence-300 hover:shadow-md"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/dashboard/jobs/${job.id}`}
            className="font-semibold text-fence-900 text-sm hover:text-fence-600 truncate block"
            onClick={(e) => e.stopPropagation()}>
            {job.customerName}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{job.fenceType} · {job.linearFeet} ft</p>
          {job.foremanName !== "Unassigned" && (
            <p className="text-xs text-gray-400 mt-0.5">👷 {job.foremanName}</p>
          )}
          {job.scheduled_date && (
            <p className="text-xs text-gray-400 mt-0.5">
              📅 {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        {job.isOwner && (
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-fence-900">{fmt(job.total_price)}</p>
            <p className={`text-xs font-semibold mt-0.5 ${(job.gross_margin_pct ?? 0) < 0.3 ? "text-red-600" : "text-green-600"}`}>
              {fmtPct(job.gross_margin_pct)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableJobCard({ job }: { job: KanbanJob }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, cursor: isDragging ? "grabbing" : "grab" }}
      {...attributes} {...listeners}>
      <JobCard job={job} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({ column, jobs }: { column: typeof COLUMNS[number]; jobs: KanbanJob[] }) {
  return (
    <div className={`rounded-xl border-2 ${column.color} p-3 flex flex-col min-h-96`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide">{column.label}</h3>
        <span className="bg-white text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-200">{jobs.length}</span>
      </div>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {jobs.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">Drop here</p>
            : jobs.map((job) => <SortableJobCard key={job.id} job={job} />)
          }
        </div>
      </SortableContext>
    </div>
  );
}

export default function JobKanban({ jobs: initialJobs }: { jobs: KanbanJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeJob, setActiveJob] = useState<KanbanJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
    let toStatus = COLUMNS.find((c) => c.id === over.id)?.id
      ?? jobs.find((j) => j.id === (over.id as string))?.status;

    if (!toStatus || fromStatus === toStatus) return;

    const allowed = VALID_TRANSITIONS[fromStatus ?? ""] ?? [];
    if (!allowed.includes(toStatus)) {
      setError(`Can't move ${fromStatus} → ${toStatus}. Valid: ${allowed.join(", ") || "none"}.`);
      return;
    }

    const captured = fromStatus;
    setJobs((prev) => prev.map((j) => j.id === draggedId ? { ...j, status: toStatus! } : j));

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("jobId", draggedId);
        fd.set("status", toStatus!);
        await updateJobStatus(fd);
      } catch {
        setJobs((prev) => prev.map((j) => j.id === draggedId ? { ...j, status: captured! } : j));
        setError("Failed to save. Please try again.");
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}
      {isPending && <p className="mb-3 text-xs text-gray-400 text-center animate-pulse">Saving…</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} column={col} jobs={jobs.filter((j) => j.status === col.id)} />
          ))}
        </div>
        <DragOverlay>{activeJob ? <JobCard job={activeJob} /> : null}</DragOverlay>
      </DndContext>
      {jobs.some((j) => j.status === "cancelled") && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Cancelled</h3>
          <div className="space-y-2">{jobs.filter((j) => j.status === "cancelled").map((job) => <JobCard key={job.id} job={job} />)}</div>
        </div>
      )}
    </div>
  );
}
