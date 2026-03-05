"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function SiteNav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-[rgba(255,255,255,0.07)] transition-colors duration-300 ${
        scrolled
          ? "bg-[#080808]/95 backdrop-blur-xl"
          : "bg-[#080808]/90 backdrop-blur-xl"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
            </svg>
          </div>
          <span className="font-display font-bold text-text text-lg tracking-tight">FenceEstimatePro</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium text-muted hover:text-text transition-colors">How It Works</a>
          <a href="#demo" className="text-sm font-medium text-muted hover:text-text transition-colors">Live Demo</a>
          <a href="#pricing" className="text-sm font-medium text-muted hover:text-text transition-colors">Pricing</a>
          <Link href="/blog" className="text-sm font-medium text-muted hover:text-text transition-colors">Blog</Link>
          <Link href="/calculator" className="text-sm font-medium text-muted hover:text-text transition-colors">Free Calculator</Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {checked && (
            loggedIn ? (
              <Link href="/dashboard" className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors">
                Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted hover:text-text transition-colors">
                  Login
                </Link>
                <a href="#waitlist" className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-light transition-colors">
                  Request Access &rarr;
                </a>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-muted">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0F0F0F] border-t border-[rgba(255,255,255,0.07)] px-4 py-4 space-y-3">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-text py-2">How It Works</a>
          <a href="#demo" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-text py-2">Live Demo</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-text py-2">Pricing</a>
          <Link href="/blog" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-text py-2">Blog</Link>
          <Link href="/calculator" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-muted hover:text-text py-2">Free Calculator</Link>
          <div className="pt-2 border-t border-[rgba(255,255,255,0.07)] flex flex-col gap-2">
            {checked && (loggedIn ? (
              <Link href="/dashboard" className="block text-center bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
                Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link href="/login" className="block text-center border border-[rgba(255,255,255,0.12)] text-text text-sm font-semibold px-4 py-2.5 rounded-lg">Login</Link>
                <a href="#waitlist" className="block text-center bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg">Request Access &rarr;</a>
              </>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
