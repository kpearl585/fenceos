"use client";

import PhoneInput from "@/components/ui/PhoneInput";
import { createCustomer } from "../actions";

const inputClass =
  "w-full border border-border bg-surface-3 text-text rounded-lg py-3 px-4 text-base placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";

const labelClass = "block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider";

export default function CustomerForm() {
  return (
    <form
      action={createCustomer}
      className="bg-surface-2 rounded-xl border border-border p-5 sm:p-8 max-w-2xl space-y-5"
    >
      <div>
        <label className={labelClass}>
          Name <span className="text-danger">*</span>
        </label>
        <input name="name" required placeholder="John Smith" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Phone</label>
        <PhoneInput name="phone" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input name="email" type="email" placeholder="john@example.com" className={inputClass} />
      </div>

      <div className="space-y-3">
        <label className={labelClass}>Address</label>
        <input name="address" placeholder="Street address" className={inputClass} />
        <div className="grid grid-cols-3 gap-3">
          <input name="city"  placeholder="City"  className={inputClass} />
          <input name="state" placeholder="ST" maxLength={2} className={inputClass} />
          <input name="zip"   placeholder="ZIP"   className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea name="notes" rows={3} placeholder="Any additional notes about this customer..." className={inputClass} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          className="w-full bg-accent hover:bg-accent-light accent-glow text-white py-4 rounded-xl text-lg font-bold transition-colors duration-150"
        >
          Save Customer
        </button>
        <button
          type="submit"
          name="afterCreate"
          value="estimate"
          className="w-full border border-accent/40 bg-surface-3 hover:bg-surface-2 text-text py-4 rounded-xl text-lg font-bold transition-colors duration-150"
        >
          Save & Start Estimate
        </button>
      </div>
    </form>
  );
}
