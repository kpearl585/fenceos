"use client";
import { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900",
    bottom: "absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900",
    left: "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900",
    right: "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} px-3 py-2 bg-gray-900 text-white text-xs rounded-lg w-64 z-50 pointer-events-none shadow-lg`}
          role="tooltip"
        >
          {content}
          <div className={arrowClasses[position]} />
        </div>
      )}
    </div>
  );
}

// Helper component for common use case: question mark icon with tooltip
export function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-fence-400"
        aria-label="Help"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </Tooltip>
  );
}
