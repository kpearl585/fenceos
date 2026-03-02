"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function SiteNav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setChecked(true);
    });
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-fence-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
            </svg>
          </div>
          <span className="font-bold text-fence-900 text-lg tracking-tight">FenceEstimatePro</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-fence-700 transition-colors">How It Works</a>
          <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-fence-700 transition-colors">Live Demo</a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-fence-700 transition-colors">Pricing</a>
          <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-fence-700 transition-colors">Blog</Link>
          <Link href="/calculator" className="text-sm font-medium text-gray-600 hover:text-fence-700 transition-colors">Free Calculator</Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {checked && (
            loggedIn ? (
              <Link href="/dashboard" className="bg-fence-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-fence-700 transition-colors">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-fence-900 transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="bg-fence-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-fence-700 transition-colors">
                  Start Free Trial →
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">How It Works</a>
          <a href="#demo" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Live Demo</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Pricing</a>
          <Link href="/blog" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Blog</Link>
          <Link href="/calculator" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Free Calculator</Link>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {checked && (loggedIn ? (
              <Link href="/dashboard" className="block text-center bg-fence-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="block text-center border border-gray-300 text-sm font-semibold px-4 py-2.5 rounded-lg">Login</Link>
                <Link href="/signup" className="block text-center bg-fence-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">Start Free Trial →</Link>
              </>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

