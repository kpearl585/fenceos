export default function CrossSell() {
  return (
    <section className="bg-[#080808] px-6 py-20 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#6B7280] font-semibold text-sm uppercase tracking-widest mb-3">More from Pearl Ventures</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="https://contractordocuments.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0F0F0F] border border-[rgba(255,255,255,0.07)] rounded-2xl p-7 hover:border-[rgba(255,255,255,0.12)] transition-colors group"
          >
            <p className="text-[#F2F2F2] font-bold text-lg font-display mb-2 group-hover:text-[#22C55E] transition-colors">ContractorDocuments.com</p>
            <p className="text-[#6B7280] text-sm leading-relaxed">Legal protection for every job. Attorney-reviewed contractor templates.</p>
            <span className="inline-block mt-4 text-[#22C55E] text-sm font-semibold">Visit site &rarr;</span>
          </a>
          <a
            href="https://pearllab.io"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0F0F0F] border border-[rgba(255,255,255,0.07)] rounded-2xl p-7 hover:border-[rgba(255,255,255,0.12)] transition-colors group"
          >
            <p className="text-[#F2F2F2] font-bold text-lg font-display mb-2 group-hover:text-[#22C55E] transition-colors">Pearl Labs</p>
            <p className="text-[#6B7280] text-sm leading-relaxed">The studio that built FenceEstimatePro. Custom software for businesses that compete to win.</p>
            <span className="inline-block mt-4 text-[#22C55E] text-sm font-semibold">Visit site &rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
