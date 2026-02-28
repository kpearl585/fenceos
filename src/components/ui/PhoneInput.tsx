"use client";

import { useState } from "react";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PhoneInput({
  name,
  defaultValue,
  placeholder = "(555) 867-5309",
  required,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(formatPhone(defaultValue || ""));

  return (
    <input
      type="tel"
      name={name}
      value={value}
      required={required}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="tel"
      className={className}
      onChange={(e) => setValue(formatPhone(e.target.value))}
    />
  );
}
