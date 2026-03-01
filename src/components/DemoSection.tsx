export default function DemoSection() {
  const features = [
    { label: "Build estimate", time: "< 5 min", icon: "📋", desc: "Line items auto-populate from your materials catalog. Margin calculated live as you type." },
    { label: "Send to customer", time: "1 click", icon: "📤", desc: "Branded link sent to the customer. They view, sign, and accept from any device." },
    { label: "Convert to job", time: "1 click", icon: "🔨", desc: "Accepted estimate becomes a job instantly. Foreman gets notified, materials verified." },
    { label: "Track to completion", time: "Real-time", icon: "✅", desc: "Kanban board moves job from Scheduled → Active → Complete. Full audit trail." },
  ];

  return (
    <section className="bg-fence-950 py-24 px-6 border-t border-fence-800/40">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-fence-500/10 border border-fence-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-fence-300 text-xs font-semibold tracking-wide uppercase">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            From estimate to signed contract<br className="hidden sm:block" /> in under 10 minutes.
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Everything a fence contractor needs — nothing they don&apos;t.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {features.map((f, i) => (
            <div key={f.label} className="relative bg-white/[0.03] border border-white/8 rounded-xl p-6 hover:border-fence-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-fence-500/10 border border-fence-500/20 flex items-center justify-center text-xs font-bold text-fence-400">
                  {i + 1}
                </div>
                <span className="text-xs font-semibold text-fence-400 bg-fence-500/10 px-2 py-0.5 rounded-full">{f.time}</span>
              </div>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-2">{f.label}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
          {/* Fake browser bar */}
          <div className="bg-[#1a1a2e] border-b border-white/10 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-white/30 text-xs font-mono">
              fenceestimatepro.com/dashboard
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="bg-fence-950 p-0 flex" style={{ minHeight: '380px' }}>
            {/* Sidebar */}
            <div className="w-48 bg-fence-950 border-r border-fence-800/60 p-4 hidden sm:block">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-fence-600 rounded-md flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
                <span className="text-white text-xs font-bold">FenceEstimatePro</span>
              </div>
              <div className="text-fence-500 text-xs uppercase tracking-wider mb-3 font-medium">Navigation</div>
              {['Overview', 'Estimates', 'Jobs', 'Customers', 'Materials', 'P&L'].map((item, i) => (
                <div key={item} className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-xs font-medium ${i === 1 ? 'bg-fence-600/20 text-fence-300' : 'text-fence-500 hover:text-fence-300'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-fence-400' : 'bg-fence-700'}`} />
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 overflow-hidden">
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Revenue MTD', value: '$24,884', delta: '+12%', up: true },
                  { label: 'Avg Margin', value: '38%', delta: '+3pts', up: true },
                  { label: 'Active Jobs', value: '7', delta: '2 due soon', up: null },
                  { label: 'Open Estimates', value: '4', delta: '$18,200', up: null },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white/[0.04] border border-white/8 rounded-lg p-3">
                    <div className="text-white/40 text-xs mb-1">{kpi.label}</div>
                    <div className="text-white font-bold text-lg leading-none mb-1">{kpi.value}</div>
                    <div className={`text-xs font-medium ${kpi.up === true ? 'text-green-400' : kpi.up === false ? 'text-red-400' : 'text-white/30'}`}>{kpi.delta}</div>
                  </div>
                ))}
              </div>

              {/* Estimates table preview */}
              <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <span className="text-white text-sm font-semibold">Recent Estimates</span>
                  <span className="text-fence-400 text-xs font-medium">+ New Estimate</span>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    { name: 'Johnson Residence', type: 'Wood Privacy', lf: '185 LF', total: '$4,200', status: 'quoted', margin: '41%' },
                    { name: 'Martinez Property', type: 'Chain Link', lf: '240 LF', total: '$3,100', status: 'accepted', margin: '38%' },
                    { name: 'Riverside HOA', type: 'Aluminum', lf: '420 LF', total: '$9,800', status: 'draft', margin: '35%' },
                  ].map(row => (
                    <div key={row.name} className="flex items-center gap-4 px-4 py-2.5 text-xs">
                      <div className="flex-1 text-white/80 font-medium truncate">{row.name}</div>
                      <div className="text-white/40 hidden md:block">{row.type}</div>
                      <div className="text-white/30 hidden lg:block">{row.lf}</div>
                      <div className="text-white font-semibold">{row.total}</div>
                      <div className="text-green-400 font-medium hidden sm:block">{row.margin}</div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'accepted' ? 'bg-green-500/10 text-green-400' :
                        row.status === 'quoted' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-white/5 text-white/30'
                      }`}>{row.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gloss overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-fence-950/60" />
        </div>

        {/* CTA below mockup */}
        <div className="text-center mt-10">
          <p className="text-white/30 text-sm mb-4">Real data. Real margin. Built for contractors who run a real business.</p>
          <a href="/#waitlist" className="inline-flex items-center gap-2 bg-fence-600 hover:bg-fence-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm">
            Join the Waitlist →
          </a>
        </div>
      </div>
    </section>
  );
}
