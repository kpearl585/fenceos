import { AccuracyDashboard } from "@/components/AccuracyDashboard";

export default function AccuracyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Estimation Accuracy</h1>
        <p className="text-muted mt-2">
          Benchmark the estimator by fence type, site difficulty, job size, and real closeout variance
        </p>
      </div>

      <AccuracyDashboard />

      <div className="mt-8 bg-warning/10 border border-warning/30 rounded-lg p-6">
        <h3 className="font-semibold text-text mb-2">How It Works</h3>
        <div className="space-y-2 text-sm text-text">
          <div>
            <strong>1. Create Estimates:</strong> When creating estimates, optionally fill in the Site Complexity form to track difficulty factors.
          </div>
          <div>
            <strong>2. Close Out Jobs:</strong> After completing a job, use the enhanced closeout form to record actual costs, labor hours, and conditions.
          </div>
          <div>
            <strong>3. Benchmark Accuracy:</strong> This dashboard shows where the estimator is strongest and where it still drifts by fence type, difficulty, and job size.
          </div>
          <div>
            <strong>4. Improve Intentionally:</strong> Use the worst misses and variance drivers to tune labor, material assumptions, and pricing discipline where it actually matters.
          </div>
        </div>
      </div>
    </div>
  );
}
