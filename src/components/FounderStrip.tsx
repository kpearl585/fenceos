export default function FounderStrip() {
  return (
    <section className="bg-[#0F0F0F] border-y border-[rgba(255,255,255,0.07)] py-16 px-6">
      <div className="max-w-[760px] mx-auto flex gap-10 items-center flex-wrap">
        <img
          src="/keegan-pearl.jpg"
          alt="Keegan Pearl - Founder"
          className="w-[100px] h-[100px] rounded-full object-cover object-top border-2 border-[rgba(22,163,74,0.4)] flex-shrink-0"
        />
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="flex items-center gap-1.5 bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] rounded-full px-2.5 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span className="text-[0.65rem] text-[#c9a84c] font-bold tracking-[0.08em]">U.S. NAVY VETERAN</span>
            </div>
          </div>
          <p className="text-base text-[rgba(255,255,255,0.8)] leading-[1.75] italic mb-3.5 border-l-2 border-[#16A34A] pl-4">
            &ldquo;I built FenceEstimatePro because fence contractors deserve software built for them &mdash; not a generic tool they have to force-fit. Fast estimates, professional proposals, jobs tracked from start to finish. Built by someone who respects the trade.&rdquo;
          </p>
          <div className="text-sm font-bold text-[#F2F2F2]">Keegan Pearl</div>
          <div className="text-[0.78rem] text-[#6B7280]">Founder &middot; FenceEstimatePro</div>
        </div>
      </div>
    </section>
  );
}
