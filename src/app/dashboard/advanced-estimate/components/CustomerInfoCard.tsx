"use client";
import type { Dispatch, SetStateAction } from "react";
import type { Customer } from "../hooks/useEstimateActions";

interface CustomerInfoCardProps {
  value: Customer;
  onChange: Dispatch<SetStateAction<Customer>>;
}

export default function CustomerInfoCard({ value, onChange }: CustomerInfoCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold text-blue-900">Customer Information</h2>
        <span className="text-xs text-blue-600 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">Required for quotes</span>
      </div>
      <p className="text-xs text-blue-700 mb-4">Enter once, used for all PDFs and estimates</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-blue-700 mb-1">Customer Name *</label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={value.name}
            onChange={(e) => onChange((c) => ({ ...c, name: e.target.value }))}
            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-blue-700 mb-1">Street Address</label>
          <input
            type="text"
            placeholder="123 Main St"
            value={value.address}
            onChange={(e) => onChange((c) => ({ ...c, address: e.target.value }))}
            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">City, State, Zip</label>
          <input
            type="text"
            placeholder="Orlando, FL 32801"
            value={value.city}
            onChange={(e) => onChange((c) => ({ ...c, city: e.target.value }))}
            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">Phone</label>
          <input
            type="text"
            placeholder="(555) 000-0000"
            value={value.phone}
            onChange={(e) => onChange((c) => ({ ...c, phone: e.target.value }))}
            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  );
}
