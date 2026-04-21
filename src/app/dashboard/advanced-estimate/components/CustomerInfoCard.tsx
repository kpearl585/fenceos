"use client";
import type { Dispatch, SetStateAction } from "react";
import type { Customer } from "../hooks/useEstimateActions";

interface CustomerInfoCardProps {
  value: Customer;
  onChange: Dispatch<SetStateAction<Customer>>;
}

export default function CustomerInfoCard({ value, onChange }: CustomerInfoCardProps) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-semibold text-text">Customer Information</h2>
        <span className="text-xs text-accent-light bg-accent/15 border border-accent/30 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Required</span>
      </div>
      <p className="text-xs text-muted mb-4">Enter once, used for all PDFs and estimates</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="est-cust-name" className="block text-xs font-medium text-muted mb-1">Customer Name *</label>
          <input
            id="est-cust-name"
            type="text"
            placeholder="Jane Smith"
            value={value.name}
            onChange={(e) => onChange((c) => ({ ...c, name: e.target.value }))}
            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="est-cust-address" className="block text-xs font-medium text-muted mb-1">Street Address</label>
          <input
            id="est-cust-address"
            type="text"
            placeholder="123 Main St"
            value={value.address}
            onChange={(e) => onChange((c) => ({ ...c, address: e.target.value }))}
            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
        </div>
        <div>
          <label htmlFor="est-cust-city" className="block text-xs font-medium text-muted mb-1">City, State, Zip</label>
          <input
            id="est-cust-city"
            type="text"
            placeholder="Orlando, FL 32801"
            value={value.city}
            onChange={(e) => onChange((c) => ({ ...c, city: e.target.value }))}
            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
        </div>
        <div>
          <label htmlFor="est-cust-phone" className="block text-xs font-medium text-muted mb-1">Phone</label>
          <input
            id="est-cust-phone"
            type="text"
            placeholder="(555) 000-0000"
            value={value.phone}
            onChange={(e) => onChange((c) => ({ ...c, phone: e.target.value }))}
            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
        </div>
      </div>
    </div>
  );
}
