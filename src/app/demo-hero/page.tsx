import Hero from "@/components/Hero";
import HeroRedesign from "@/components/HeroRedesign";

export default function DemoHeroPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900 text-white py-4 px-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Hero Redesign Comparison</h1>
          <div className="flex gap-4">
            <a href="#original" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
              View Original
            </a>
            <a href="#redesign" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">
              View Redesign
            </a>
          </div>
        </div>
      </div>

      {/* Original Dark Hero */}
      <div id="original" className="relative border-b-8 border-red-500">
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-bold z-10">
          ⬇️ ORIGINAL - Dark Mode (Current)
        </div>
        <div className="pt-12">
          <Hero />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-bold">
          ⬆️ END ORIGINAL
        </div>
      </div>

      {/* Redesigned Light Hero */}
      <div id="redesign" className="relative border-b-8 border-green-500">
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-2 text-sm font-bold z-10">
          ⬇️ REDESIGN - Light Mode (Contractor-Focused)
        </div>
        <div className="pt-12">
          <HeroRedesign />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-center py-2 text-sm font-bold">
          ⬆️ END REDESIGN
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-gray-100 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Key Differences</h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">🎨 Visual Style</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-red-600 mb-2">Original (Dark)</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Dark background (#080808)</li>
                    <li>• Green glow effects</li>
                    <li>• Grid pattern background</li>
                    <li>• Tech startup aesthetic</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-green-600 mb-2">Redesign (Light)</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• White background</li>
                    <li>• Clean, professional</li>
                    <li>• Subtle texture only</li>
                    <li>• Business tool aesthetic</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">📝 Messaging</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-red-600 mb-2">Original</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• "Stop Guessing Quantities"</li>
                    <li>• Features: FenceGraph engine</li>
                    <li>• Technical language</li>
                    <li>• "Request Early Access"</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-green-600 mb-2">Redesign</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• "5 Minutes. Not 45."</li>
                    <li>• Benefits: Time + money savings</li>
                    <li>• Contractor language</li>
                    <li>• "Start Free Trial"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">📸 Screenshot</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-red-600 mb-2">Original</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Complex mockup interface</li>
                    <li>• 3 fence runs shown</li>
                    <li>• Lots of data fields</li>
                    <li>• Looks like a demo</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-green-600 mb-2">Redesign</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Simple estimate view</li>
                    <li>• 1 real job shown</li>
                    <li>• Key metrics only</li>
                    <li>• "Real Estimate" badge</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <h3 className="text-xl font-bold text-green-900 mb-3">✅ Recommended Next Steps</h3>
              <ol className="space-y-2 text-gray-700">
                <li><strong>1.</strong> Test redesign on mobile device (contractors browse on phones)</li>
                <li><strong>2.</strong> Get feedback from 2-3 real contractors</li>
                <li><strong>3.</strong> Replace fake screenshot with REAL estimate from production</li>
                <li><strong>4.</strong> A/B test for 2 weeks, measure signup conversion</li>
                <li><strong>5.</strong> If redesign wins, apply same principles to rest of site</li>
              </ol>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              ← Back to Main Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
