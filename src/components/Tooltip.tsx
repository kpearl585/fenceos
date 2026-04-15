"use client";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";

type TriggerProps = HTMLAttributes<HTMLElement>;

interface TooltipProps {
  content: string;
  children: ReactElement<TriggerProps>;
  position?: "top" | "bottom" | "left" | "right";
}

const POSITION_CLASSES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const ARROW_CLASSES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900",
  bottom: "absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900",
  left: "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900",
  right: "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900",
};

export default function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Dismiss on Escape and on outside click (covers touch tap-outside too).
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVisible(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isVisible]);

  if (!isValidElement<TriggerProps>(children)) {
    return <>{children}</>;
  }

  const childProps = children.props;
  const trigger = cloneElement<TriggerProps>(children, {
    "aria-describedby": isVisible ? tooltipId : childProps["aria-describedby"],
    onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => {
      setIsVisible(true);
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: ReactMouseEvent<HTMLElement>) => {
      setIsVisible(false);
      childProps.onMouseLeave?.(e);
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      setIsVisible(true);
      childProps.onFocus?.(e);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      setIsVisible(false);
      childProps.onBlur?.(e);
    },
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      // Tap-to-toggle for touch; also lets keyboard users open via Enter/Space.
      e.preventDefault();
      e.stopPropagation();
      setIsVisible((v) => !v);
      childProps.onClick?.(e);
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        setIsVisible(false);
      }
      childProps.onKeyDown?.(e);
    },
  });

  return (
    <span ref={wrapperRef} className="relative inline-block">
      {trigger}
      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute ${POSITION_CLASSES[position]} px-3 py-2 bg-gray-900 text-white text-xs rounded-lg w-64 z-50 shadow-lg`}
        >
          {content}
          <span className={ARROW_CLASSES[position]} aria-hidden="true" />
        </span>
      )}
    </span>
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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </Tooltip>
  );
}
