"use client";
import type { ReactNode } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  activeBadge?: ReactNode;
  ariaLabel?: string;
}

// Single reusable toggle row for boolean options (wind mode, removal, etc).
// Previously this markup was copy-pasted across ProjectSetupCard — extracting
// it means a single place to change the visual or accessibility treatment.
export default function ToggleSwitch({
  checked,
  onToggle,
  label,
  activeBadge,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-fence-600" : "bg-gray-200"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {checked && activeBadge}
    </div>
  );
}
