export default function DemoSection() {
  const features = [
    { label: "Build estimate", time: "< 5 min", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>', desc: "Line items auto-populate from your materials catalog. Margin calculated live as you type." },
    { label: "Send to customer", time: "1 click", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>', desc: "Branded link sent to the customer. They view, sign, and accept from any device." },
    { label: "Convert to job", time: "1 click", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', desc: "Accepted estimate becomes a job instantly. Foreman gets notified, materials verified." },
    { label: "Track to completion", time: "Real-time", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', desc: "Kanban board moves job from Scheduled \u2192 Active \u2192 Complete. Full audit trail." },
  ];

  return (
    <section className="bg-[#080808] py-24 px-6 border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.2)] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[#22C55E] text-xs font-semibold tracking-wide uppercase">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#F2F2F2] font-display mb-4 tracking-tight">
            From estimate to signed contract<br className="hidden sm:block" /> in under 10 minutes.
          </h2>
          <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
            Everything a fence contractor needs. Nothing extra.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {features.map((f, i) => (
            <div key={f.label} className="relative bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 hover:border-[rgba(22,163,74,0.3)] transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.2)] flex items-center justify-center text-xs font-bold text-[#22C55E]">
                  {i + 1}
                </div>
                <span className="text-xs font-semibold text-[#22C55E] bg-[rgba(22,163,74,0.1)] px-2 py-0.5 rounded-full">{f.time}</span>
              </div>
              <div className="mb-3" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="text-[#F2F2F2] font-semibold mb-2">{f.label}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.07)] shadow-2xl shadow-black/50">
          {/* Fake browser bar */}
          <div className="bg-[#1C1C1C] border-b border-[rgba(255,255,255,0.07)] px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
            </div>
            <div className="flex-1 bg-[rgba(255,255,255,0.05)] rounded-md px-3 py-1 text-[#6B7280] text-xs font-mono">
              fenceestimatepro.com/dashboard
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="bg-[#080808] p-0 flex" style={{ minHeight: '380px' }}>
            {/* Sidebar */}
            <div className="w-48 bg-[#080808] border-r border-[rgba(255,255,255,0.07)] p-4 hidden sm:block">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-[#16A34A] rounded-md flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white rounded-sm" />
                </div>
                <span className="text-[#F2F2F2] text-xs font-bold font-display">FenceEstimatePro</span>
              </div>
              <div className="text-[#6B7280] text-xs uppercase tracking-wider mb-3 font-medium">Navigation</div>
              {['Overview', 'Estimates', 'Jobs', 'Customers', 'Materials', 'P&L'].map((item, i) => (
                <div key={item} className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-xs font-medium ${i === 1 ? 'bg-[rgba(22,163,74,0.15)] text-[#22C55E]' : 'text-[#6B7280] hover:text-[#F2F2F2]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-[#22C55E]' : 'bg-[rgba(255,255,255,0.1)]'}`} />
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
                  <div key={kpi.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg p-3">
                    <div className="text-[#6B7280] text-xs mb-1">{kpi.label}</div>
                    <div className="text-[#F2F2F2] font-bold text-lg leading-none mb-1 font-display">{kpi.value}</div>
                    <div className={`text-xs font-medium ${kpi.up === true ? 'text-[#22C55E]' : kpi.up === false ? 'text-[#EF4444]' : 'text-[#6B7280]'}`}>{kpi.delta}</div>
                  </div>
                ))}
              </div>

              {/* Estimates table preview */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
                  <span className="text-[#F2F2F2] text-sm font-semibold">Recent Estimates</span>
                  <span className="text-[#22C55E] text-xs font-medium">+ New Estimate</span>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {[
                    { name: 'Johnson Residence', type: 'Wood Privacy', lf: '185 LF', total: '$4,200', status: 'quoted', margin: '41%' },
                    { name: 'Martinez Property', type: 'Chain Link', lf: '240 LF', total: '$3,100', status: 'accepted', margin: '38%' },
                    { name: 'Riverside HOA', type: 'Aluminum', lf: '420 LF', total: '$9,800', status: 'draft', margin: '35%' },
                  ].map(row => (
                    <div key={row.name} className="flex items-center gap-4 px-4 py-2.5 text-xs">
                      <div className="flex-1 text-[#F2F2F2]/80 font-medium truncate">{row.name}</div>
                      <div className="text-[#6B7280] hidden md:block">{row.type}</div>
                      <div className="text-[#6B7280] hidden lg:block">{row.lf}</div>
                      <div className="text-[#F2F2F2] font-semibold">{row.total}</div>
                      <div className="text-[#22C55E] font-medium hidden sm:block">{row.margin}</div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'accepted' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' :
                        row.status === 'quoted' ? 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]' :
                        'bg-[rgba(255,255,255,0.05)] text-[#6B7280]'
                      }`}>{row.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gloss overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#080808]/60" />
        </div>

        {/* CTA below mockup */}
        <div className="text-center mt-10">
          <p className="text-[#6B7280] text-sm mb-4">Real data. Real margin. Built for contractors who run a real business.</p>
          <a href="/signup" className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#22C55E] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm">
            Start Free Trial &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
