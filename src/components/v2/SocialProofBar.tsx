export default function SocialProofBar() {
  return (
    <section className="bg-gray-50 border-y border-gray-200 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm text-gray-500 mb-6">Trusted by fence contractors nationwide</p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <div className="flex items-center gap-2 text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-sm font-medium">Bank-Level Security</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#c9a84c" stroke="#c9a84c" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-sm font-medium">Veteran-Owned</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-sm font-medium">4.9/5 Rating</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-sm font-medium">Setup in 5 Minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
