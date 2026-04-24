import { getQuoteByToken } from "../actions";
import { QuoteAcceptanceForm } from "./QuoteAcceptanceForm";
import ARViewerButton from "@/components/ar/ARViewerButton";
import type { BomItem, FenceProjectInput } from "@/lib/fence-graph/types";
import { Metadata } from "next";
import Link from "next/link";

// Roll up gates from the estimator input into the few human-readable
// lines the homeowner cares about: "1 × 4-ft walk gate" etc. Handles
// both the top-level input.gates shape (legacy / some UI flows) and
// the per-run input.runs[].gates shape (AI extract output) so the
// summary stays honest regardless of which path produced the graph.
function summarizeGates(input: FenceProjectInput): Array<{ key: string; label: string; count: number }> {
  // AI-extract shape uses `type: walk | drive | double_drive | pool`.
  // Estimator shape uses `gateType: single | double` + `isPoolGate`.
  const AI_TYPE_LABEL: Record<string, string> = {
    walk:         "walk gate",
    drive:        "drive gate",
    double_drive: "double drive gate",
    pool:         "pool-code gate",
  };
  const HINGE_LABEL: Record<string, string> = {
    standard:     "standard hinges",
    self_closing: "self-closing hinges",
  };
  const LATCH_LABEL: Record<string, string> = {
    standard:   "standard latch",
    lokk_latch: "LokkLatch",
    magnetic:   "magnetic latch",
    slide_bolt: "slide-bolt latch",
  };
  const COLOR_LABEL: Record<string, string> = {
    black: "black", bronze: "bronze", white: "white",
  };
  const POST_INSERT_LABEL: Record<string, string> = {
    aluminum: "aluminum post insert",
    steel:    "steel post insert",
  };

  const map = new Map<string, { key: string; label: string; count: number }>();

  const hardwareSuffix = (g: {
    hinges?: string; latch?: string; hardwareColor?: string; postInsert?: string;
  }): string => {
    const parts: string[] = [];
    const color = g.hardwareColor ? COLOR_LABEL[g.hardwareColor] : null;
    if (g.hinges && HINGE_LABEL[g.hinges]) {
      parts.push(color ? `${color} ${HINGE_LABEL[g.hinges]}` : HINGE_LABEL[g.hinges]);
    }
    if (g.latch && LATCH_LABEL[g.latch]) {
      parts.push(color && !g.hinges ? `${color} ${LATCH_LABEL[g.latch]}` : LATCH_LABEL[g.latch]);
    }
    if (g.postInsert && POST_INSERT_LABEL[g.postInsert]) {
      parts.push(POST_INSERT_LABEL[g.postInsert]);
    }
    return parts.length ? ` · ${parts.join(", ")}` : "";
  };

  const pushAI = (widthFt: number, type: string) => {
    if (!Number.isFinite(widthFt) || widthFt <= 0) return;
    const typeLabel = AI_TYPE_LABEL[type] ?? "gate";
    const key = `ai-${widthFt}-${type}`;
    const label = `${widthFt}-ft ${typeLabel}`;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { key, label, count: 1 });
  };

  const pushEstimator = (g: {
    widthFt?: number; gateType?: string; isPoolGate?: boolean;
    hinges?: string; latch?: string; hardwareColor?: string; postInsert?: string;
  }) => {
    const widthFt = typeof g.widthFt === "number" ? g.widthFt : NaN;
    if (!Number.isFinite(widthFt) || widthFt <= 0) return;
    const baseLabel = g.isPoolGate
      ? "pool-code gate"
      : g.gateType === "double" ? "double gate" : "walk gate";
    const suffix = hardwareSuffix(g);
    const key = `est-${widthFt}-${g.gateType ?? "single"}-${g.isPoolGate ? "pool" : ""}-${suffix}`;
    const label = `${widthFt}-ft ${baseLabel}${suffix}`;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { key, label, count: 1 });
  };

  const topLevel = (input as unknown as {
    gates?: Array<{
      widthFt?: number; type?: string; gateType?: string; isPoolGate?: boolean;
      hinges?: string; latch?: string; hardwareColor?: string; postInsert?: string;
    }>;
  }).gates;
  if (Array.isArray(topLevel)) {
    for (const g of topLevel) {
      if (typeof g?.widthFt === "number" && typeof g?.type === "string") {
        pushAI(g.widthFt, g.type);
      } else if (typeof g?.widthFt === "number" && typeof g?.gateType === "string") {
        pushEstimator(g);
      }
    }
  }
  const runs = (input as unknown as {
    runs?: Array<{ gates?: Array<{ widthFt?: number; type?: string }> }>;
  }).runs;
  if (Array.isArray(runs)) {
    for (const run of runs) {
      for (const g of run?.gates ?? []) {
        if (typeof g?.widthFt === "number" && typeof g?.type === "string") pushAI(g.widthFt, g.type);
      }
    }
  }
  return Array.from(map.values());
}

// Category labels shown in the customer-facing Scope of Work table.
// Keys map to BomItem.category strings the engine emits; anything not
// in the map gets skipped (internal line items like regulatory or
// edge-case flags shouldn't leak into the customer view).
const SCOPE_CATEGORY_LABEL: Record<string, string> = {
  posts:     "Posts & rails",
  panels:    "Fence panels",
  pickets:   "Pickets",
  rails:     "Rails",
  fabric:    "Chain-link fabric",
  concrete:  "Concrete & footings",
  hardware:  "Hardware & fasteners",
  gates:     "Gates",
  equipment: "Equipment",
  logistics: "Delivery",
  removal:   "Old fence removal",
};

// Fixed display order so the table always reads "foundation up".
const SCOPE_CATEGORY_ORDER = [
  "posts", "panels", "pickets", "rails", "fabric",
  "concrete", "hardware", "gates",
  "removal", "equipment", "logistics",
];

interface ScopeGroup {
  label: string;
  items: { name: string; qty: number; unit: string }[];
}

function buildScopeGroups(bom: BomItem[]): ScopeGroup[] {
  const byCategory = new Map<string, BomItem[]>();
  for (const item of bom) {
    if (!SCOPE_CATEGORY_LABEL[item.category]) continue;
    if ((item.qty ?? 0) <= 0) continue;
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const out: ScopeGroup[] = [];
  for (const category of SCOPE_CATEGORY_ORDER) {
    const items = byCategory.get(category);
    if (!items || items.length === 0) continue;
    out.push({
      label: SCOPE_CATEGORY_LABEL[category],
      items: items.map(it => ({ name: it.name, qty: it.qty, unit: it.unit })),
    });
  }
  return out;
}

function formatDuration(totalHrs: number, hoursPerDay: number): string {
  if (!totalHrs || !hoursPerDay) return "Typically 2–4 days";
  const days = Math.max(1, Math.ceil(totalHrs / hoursPerDay));
  if (days === 1) return "About 1 day";
  if (days <= 5)  return `${days} days`;
  return `${days} days (may span multiple weeks depending on weather)`;
}

export const metadata: Metadata = {
  title: "View Quote - FenceEstimatePro",
  description: "Review and accept your fence installation quote",
  robots: { index: false, follow: false }, // Don't index quote pages
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function QuoteViewPage({ params }: Props) {
  const { token } = await params;
  const result = await getQuoteByToken(token);

  // Error state
  if (!result.success || !result.quote) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-surface rounded-xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">Quote Not Found</h1>
          <p className="text-muted mb-6">
            {result.error || "This quote link is invalid or has expired."}
          </p>
          <p className="text-sm text-muted">
            If you believe this is an error, please contact the contractor who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  const { quote } = result;
  const isExpired = quote.token_expires_at && new Date(quote.token_expires_at) < new Date();
  const isAccepted = !!quote.customer_accepted_at;

  // Calculate display values
  const input = quote.input_json;
  const result_data = quote.result_json;
  const totalLF = input.runs.reduce((sum, run) => sum + run.linearFeet, 0);
  const totalGates = input.gates?.length ?? 0;

  // Determine fence type from productLineId
  const fenceType = input.productLineId?.includes("vinyl") ? "Vinyl"
    : input.productLineId?.includes("wood") ? "Wood"
    : input.productLineId?.includes("chain") ? "Chain Link"
    : input.productLineId?.includes("aluminum") ? "Aluminum"
    : "Fence";
  const fenceHeight = input.fenceHeight || 6;

  return (
    <div className="min-h-screen bg-surface-2">
      {/* Header */}
      <div className="border-b border-white/10 bg-surface-3">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-surface-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{quote.name}</h1>
                <p className="text-white/70 text-sm">{quote.org.name}</p>
              </div>
            </div>
            {isAccepted && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-green-300">Accepted</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Accepted Message */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-green-900 mb-2">Quote Accepted!</h2>
                <p className="text-green-800 mb-4">
                  Thank you for accepting this quote. Your contractor has been notified and will contact you shortly to schedule the installation.
                </p>
                <p className="text-sm text-green-700">
                  Accepted on {new Date(quote.customer_accepted_at!).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && !isAccepted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-yellow-900 mb-2">Quote Expired</h2>
                <p className="text-yellow-800">
                  This quote expired on {new Date(quote.token_expires_at!).toLocaleDateString()}.
                  Please contact {quote.org.name} to request an updated quote.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AR Preview — only for AR-enabled quotes that aren't yet
            accepted or expired. Sits above Project Details so the
            homeowner has a chance to see the fence in AR before they
            start reviewing pricing and acceptance. */}
        {quote.ar_enabled && !isAccepted && !isExpired && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden mb-8">
            <div className="bg-surface-2 border-b border-accent/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
                    <path d="m2 12 10 5 10-5" />
                    <path d="m2 17 10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">See Your Fence In AR</h2>
                  <p className="text-sm text-muted">Preview your fence on your actual property using your phone</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ARViewerButton token={token} launchedBy="customer" variant="primary" />
              <p className="text-xs text-muted mt-3">Works on most modern iPhones and Android phones. No app download required.</p>
            </div>
          </div>
        )}

        {/* Quote Details */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden mb-8">
          <div className="bg-background border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold text-text">Project Details</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Scope */}
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Scope of Work</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-4">
                  <p className="text-sm text-muted mb-1">Fence Type</p>
                  <p className="text-lg font-semibold text-text capitalize">{fenceType}</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <p className="text-sm text-muted mb-1">Height</p>
                  <p className="text-lg font-semibold text-text">{fenceHeight} feet</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <p className="text-sm text-muted mb-1">Total Linear Feet</p>
                  <p className="text-lg font-semibold text-text">{totalLF.toFixed(0)} LF</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <p className="text-sm text-muted mb-1">Gates</p>
                  <p className="text-lg font-semibold text-text">{totalGates} {totalGates === 1 ? "gate" : "gates"}</p>
                </div>
              </div>
            </div>

            {/* Fence Runs */}
            {input.runs.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Fence Sections</h3>
                <div className="space-y-2">
                  {input.runs.map((run, idx) => (
                    <div key={idx} className="bg-background rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-text">Section {idx + 1}</span>
                        <span className="text-sm text-muted">{run.linearFeet} LF</span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {run.startType} to {run.endType}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Scope of Work — what the customer is actually buying. Builds
            from result.bom grouped by category. Deliberately shows
            quantity only (no per-line dollar amounts) so we can't be
            accidentally leaking cost-vs-price details. */}
        {result_data?.bom && result_data.bom.length > 0 && (() => {
          const groups = buildScopeGroups(result_data.bom as BomItem[]);
          const gateSummary = summarizeGates(input);
          const fenceSummaryLine =
            totalLF > 0 ? `${totalLF.toFixed(0)} linear feet of ${fenceHeight}-ft ${fenceType} fence` : null;
          const hasAnySummary = !!fenceSummaryLine || gateSummary.length > 0 || groups.length > 0;
          if (!hasAnySummary) return null;

          const Check = () => (
            <svg className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          );

          return (
            <div className="bg-surface rounded-xl border border-border overflow-hidden mb-8">
              <div className="bg-background border-b border-border px-6 py-4">
                <h2 className="text-lg font-bold text-text">Scope of Work</h2>
                <p className="text-xs text-muted mt-0.5">What&rsquo;s included in this quote.</p>
              </div>
              <div className="p-6">
                {/* Simple summary — the four lines a homeowner actually
                    cares about. Keeps the default view from feeling
                    like a bill of materials. */}
                <ul className="space-y-3 text-sm text-text">
                  {fenceSummaryLine && (
                    <li className="flex items-start gap-2">
                      <Check />
                      <span>{fenceSummaryLine}</span>
                    </li>
                  )}
                  {gateSummary.map(g => (
                    <li key={g.key} className="flex items-start gap-2">
                      <Check />
                      <span>{g.count} &times; {g.label}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>
                      All materials, hardware, concrete, and professional installation
                      {typeof result_data.totalLaborHrs === "number" && result_data.totalLaborHrs > 0 && (
                        <span className="text-muted"> (~{Math.round(result_data.totalLaborHrs)} crew-hours)</span>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>Site cleanup and debris removal</span>
                  </li>
                </ul>

                {/* Full materials breakdown — disclosure for homeowners
                    who want to see every post and panel counted out.
                    Most customers will never open this; the ones who do
                    are the detail-oriented buyers who appreciate it. */}
                {groups.length > 0 && (
                  <details className="mt-6 group">
                    <summary className="text-xs font-semibold text-muted hover:text-accent cursor-pointer flex items-center gap-1.5 list-none">
                      <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Show full materials breakdown
                    </summary>
                    <ul className="mt-4 pt-4 border-t border-border divide-y divide-border">
                      {groups.map(group => (
                        <li key={group.label} className="py-3">
                          <p className="font-semibold text-text text-sm">{group.label}</p>
                          <ul className="mt-1 text-sm text-muted space-y-0.5">
                            {group.items.map((it, i) => (
                              <li key={i}>
                                &bull; {it.name}
                                <span className="text-muted"> ({it.qty} {it.unit})</span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          );
        })()}

        {/* Project Timeline + Warranty row — same pair the PDF proposal
            carries so the web share quote matches what the customer
            eventually sees in PDF form. */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="bg-background border-b border-border px-6 py-4">
              <h2 className="text-sm font-bold text-text uppercase tracking-wide">Project Timeline</h2>
            </div>
            <div className="p-6 space-y-2 text-sm text-text">
              <p>
                <span className="font-semibold text-text">Estimated duration:</span>{" "}
                {formatDuration(
                  typeof result_data?.totalLaborHrs === "number" ? result_data.totalLaborHrs : 0,
                  8
                )}
              </p>
              <p className="text-xs text-muted">
                Installation typically begins within 2&ndash;3 weeks of deposit, subject to weather, material availability, and permit timing.
              </p>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="bg-background border-b border-border px-6 py-4">
              <h2 className="text-sm font-bold text-text uppercase tracking-wide">Warranty</h2>
            </div>
            <div className="p-6 space-y-2 text-sm text-text">
              <p><span className="font-semibold text-text">Workmanship:</span> 1 year from completion.</p>
              <p><span className="font-semibold text-text">Materials:</span> manufacturer warranty, varies by product.</p>
              <p className="text-xs text-muted">
                Excludes acts of nature, soil settling, and modifications made after installation.
              </p>
            </div>
          </div>
        </div>

        {/* Investment — lump-sum total + per-LF + valid-until. Mirrors
            the PDF's "Investment Summary" box rather than a bare number. */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden mb-8">
          <div className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Investment</h2>
            {quote.token_expires_at && (
              <p className="text-xs text-muted">
                Valid until {new Date(quote.token_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="p-6">
            <div className="bg-surface-2 border border-accent/30 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-text">Total project investment</span>
                <span className="text-3xl font-bold text-text">
                  ${quote.bid_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {totalLF > 0 && (
                <p className="text-sm text-muted mt-2">
                  ${(quote.bid_price / totalLF).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per linear foot &middot; {totalLF.toFixed(0)} LF total
                </p>
              )}
              <p className="text-sm text-muted mt-1">
                Includes all materials, crew labor, site cleanup, and installation.
              </p>
            </div>
          </div>
        </div>

        {/* Ready to get started — mirrors the PDF's "next steps" block
            and keeps momentum flowing from the scope tables into the
            acceptance form below. */}
        {!isAccepted && !isExpired && (
          <div className="bg-surface-2 border border-accent/30 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-text mb-1">Ready to get started?</h2>
            <p className="text-sm text-accent-light mb-4">Here&rsquo;s what happens next:</p>
            <ol className="space-y-2 text-sm text-text">
              <li className="flex items-start gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center bg-accent text-white rounded-full text-xs font-bold flex-shrink-0">1</span>
                <span>Review the scope, pricing, and terms above.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center bg-accent text-white rounded-full text-xs font-bold flex-shrink-0">2</span>
                <span>Sign below to accept. Your contractor is notified immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center bg-accent text-white rounded-full text-xs font-bold flex-shrink-0">3</span>
                <span>Deposit + scheduling details follow from {quote.org.name}.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center bg-accent text-white rounded-full text-xs font-bold flex-shrink-0">4</span>
                <span>Crew installs. Final walkthrough when it&rsquo;s done.</span>
              </li>
            </ol>
            {(quote.org.phone || quote.org.email) && (
              <p className="text-xs text-accent mt-4">
                Questions? {quote.org.phone && <>Call <a href={`tel:${quote.org.phone}`} className="underline">{quote.org.phone}</a></>}
                {quote.org.phone && quote.org.email && " or "}
                {quote.org.email && <>email <a href={`mailto:${quote.org.email}`} className="underline">{quote.org.email}</a></>}.
              </p>
            )}
          </div>
        )}

        {/* Terms — shown inline so the customer sees exactly what
            they're agreeing to before signing. Same text is also
            embedded in the signed contract PDF. */}
        {(quote.legal_terms_snapshot || quote.payment_terms_snapshot) && (
          <details className="bg-surface rounded-xl border border-border overflow-hidden mb-8 group">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none bg-background border-b border-border group-open:border-b-gray-200">
              <div>
                <h2 className="text-lg font-bold text-text">Terms & Conditions</h2>
                <p className="text-xs text-muted mt-0.5">Review the legal and payment terms before accepting.</p>
              </div>
              <svg className="w-5 h-5 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="p-6 space-y-6">
              {quote.legal_terms_snapshot && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Legal Terms</h3>
                  <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{quote.legal_terms_snapshot}</p>
                </div>
              )}
              {quote.payment_terms_snapshot && (
                <div>
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Payment Terms</h3>
                  <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{quote.payment_terms_snapshot}</p>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Acceptance Form or Contact Info */}
        {!isAccepted && !isExpired ? (
          <QuoteAcceptanceForm token={token} />
        ) : (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold text-text mb-4">Contact Information</h3>
            <div className="space-y-3">
              {quote.org.phone && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${quote.org.phone}`} className="text-accent hover:text-accent font-medium">
                    {quote.org.phone}
                  </a>
                </div>
              )}
              {quote.org.email && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${quote.org.email}`} className="text-accent hover:text-accent font-medium">
                    {quote.org.email}
                  </a>
                </div>
              )}
              {quote.org.address && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-muted mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-text">{quote.org.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-white/50">
            Powered by <Link href="/" className="text-accent-light hover:text-accent-light">FenceEstimatePro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
