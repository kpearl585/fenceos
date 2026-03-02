interface TimelineEvent {
  label: string;
  date: string | null;
  done: boolean;
  icon: string;
}

interface Props {
  jobCreatedAt: string;
  jobStatus: string;
  scheduledDate?: string | null;
  estimateAcceptedAt?: string | null;
}

const STATUS_ORDER = ["scheduled", "active", "complete"];

export default function ActivityTimeline({ jobCreatedAt, jobStatus, scheduledDate, estimateAcceptedAt }: Props) {
  const statusIndex = STATUS_ORDER.indexOf(jobStatus);

  const events: TimelineEvent[] = [
    {
      label: "Job Created",
      date: jobCreatedAt,
      done: true,
      icon: "1",
    },
    {
      label: "Estimate Accepted",
      date: estimateAcceptedAt ?? null,
      done: !!estimateAcceptedAt || statusIndex >= 0,
      icon: "2",
    },
    {
      label: "Job Scheduled",
      date: scheduledDate ?? null,
      done: statusIndex >= 0,
      icon: "3",
    },
    {
      label: "Job Started",
      date: jobStatus === "active" || jobStatus === "complete" ? scheduledDate ?? null : null,
      done: jobStatus === "active" || jobStatus === "complete",
      icon: "4",
    },
    {
      label: "Job Completed",
      date: jobStatus === "complete" ? new Date().toISOString() : null,
      done: jobStatus === "complete",
      icon: "5",
    },
  ];

  function fmtDate(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="font-semibold text-fence-900 text-sm mb-4">Activity Timeline</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
        <ul className="space-y-4">
          {events.map((event, i) => (
            <li key={i} className="flex items-start gap-4 relative">
              <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                event.done ? "bg-fence-100" : "bg-gray-100"
              }`}>
                <span className={event.done ? "" : "opacity-40"}>{event.icon}</span>
              </div>
              <div className="pt-1">
                <p className={`text-sm font-semibold ${event.done ? "text-fence-900" : "text-gray-400"}`}>
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(event.date)}</p>
                )}
                {!event.done && (
                  <p className="text-xs text-gray-300 mt-0.5">Pending</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
