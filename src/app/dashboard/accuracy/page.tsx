import { AccuracyDashboard } from "@/components/AccuracyDashboard";

export default function AccuracyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Estimation Accuracy</h1>
        <p className="text-gray-600 mt-2">
          Track how accurate your estimates are and continuously improve
        </p>
      </div>

      <AccuracyDashboard />

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">📚 How It Works</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div>
            <strong>1. Create Estimates:</strong> When creating estimates, optionally fill in the Site Complexity form to track difficulty factors.
          </div>
          <div>
            <strong>2. Close Out Jobs:</strong> After completing a job, use the enhanced closeout form to record actual costs, labor hours, and conditions.
          </div>
          <div>
            <strong>3. Track Accuracy:</strong> This dashboard shows your variance over time. Positive = over estimate, negative = under estimate.
          </div>
          <div>
            <strong>4. Improve Estimates:</strong> Use insights to adjust your labor rates, waste percentages, and timeline calculations.
          </div>
        </div>
      </div>
    </div>
  );
}
