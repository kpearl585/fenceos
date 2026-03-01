"use client";

import { useEffect, useState } from "react";

export default function WaitlistCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);

  async function fetchCount() {
    try {
      const res = await fetch("/api/waitlist-count");
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {
      setCount(0);
    }
  }

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Animate count up from 0 to actual count
  useEffect(() => {
    if (count === null || count === 0) return;
    let start = 0;
    const duration = 1000;
    const step = 16;
    const increment = count / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= count) {
        setDisplay(count);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [count]);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-fence-300">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
      </span>
      {count > 0 ? (
        <span>Join <strong className="text-white">{display.toLocaleString()}</strong> contractors already on the waitlist</span>
      ) : (
        <span>Join the waitlist — limited early access</span>
      )}
    </div>
  );
}
