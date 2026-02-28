"use client";

import PhoneInput from "@/components/ui/PhoneInput";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import { createCustomer } from "../actions";

const inputClass =
  "w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500";

export default function CustomerForm() {
  return (
    <form
      action={createCustomer}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-8 max-w-2xl space-y-5"
    >
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          placeholder="John Smith"
          className={inputClass}
        />
      </div>

      {/* Phone — auto-formats as you type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Phone
        </label>
        <PhoneInput name="phone" className={inputClass} />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          placeholder="john@example.com"
          className={inputClass}
        />
      </div>

      {/* Address — Google Places autocomplete */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Address
        </label>
        <AddressAutocomplete
          streetName="address"
          cityName="city"
          stateName="state"
          zipName="zip"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any additional notes about this customer..."
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-fence-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-fence-700 transition-colors"
      >
        Save Customer
      </button>
    </form>
  );
}
