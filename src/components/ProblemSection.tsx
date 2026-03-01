export default function ProblemSection() {
  return (
    <section className="bg-gray-50 px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-fence-600 font-semibold text-sm uppercase tracking-widest mb-3">Sound familiar?</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">This is where fence contractors lose money every week</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
              title: "You're still estimating by hand",
              body: "Scribbling on paper or copy-pasting last month's spreadsheet. One wrong number and you eat $800 on a job you thought was profitable.",
            },
            {
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
              title: "Materials are always off",
              body: "You forget the post caps, undercount panels, or miss hardware. You find out at the supply house — mid-job — and the margin is already gone.",
            },
            {
              icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>',
              title: "Change orders kill your profit",
              body: "Customer wants a double gate. You add $400. But material cost went up $600. You shake hands on a deal that costs you money.",
            },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
              <div className="mb-4" dangerouslySetInnerHTML={{ __html: card.icon }} />
              <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{card.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-10 text-gray-500 text-sm">
          The average fence contractor loses <strong className="text-gray-900">$1,200–$2,400 per month</strong> to underbid jobs and bad estimates. That&apos;s $14,000–$28,000 a year.
        </p>
      </div>
    </section>
  );
}
