"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#2D6A4F] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-[#1e4d38] transition-colors"
    >
      Save as PDF
    </button>
  );
}
