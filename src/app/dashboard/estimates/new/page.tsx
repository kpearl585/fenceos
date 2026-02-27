import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createEstimate } from "../actions";
import { FENCE_TYPE_OPTIONS } from "@/lib/estimate-engine";

export default async function NewEstimatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) redirect("/dashboard");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .order("name");

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/estimates"
          className="text-sm text-fence-600 hover:text-fence-800 font-medium"
        >
          ← Back to Estimates
        </Link>
        <h1 className="text-2xl font-bold text-fence-900 mt-2">
          New Estimate
        </h1>
      </div>

      <form
        action={createEstimate}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-8 max-w-2xl space-y-6"
      >
        {/* ── Customer ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Customer
          </label>
          <select
            name="customerId"
            defaultValue=""
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          >
            <option value="">No customer</option>
            {customers?.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Add new customer</option>
          </select>
        </div>

        {/* Inline new-customer fields (toggled client-side) */}
        <div id="newCustFields" className="space-y-3 hidden">
          <input
            name="customerName"
            placeholder="Customer name"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base"
          />
          <input
            name="customerPhone"
            placeholder="Phone (optional)"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base"
          />
          <input
            name="customerAddress"
            placeholder="Address (optional)"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base"
          />
        </div>

        {/* ── Title ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Estimate Title{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            name="title"
            placeholder="e.g. Smith Backyard Privacy Fence"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* ── Fence Type ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fence Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FENCE_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="relative flex items-center justify-center border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-fence-400 transition-colors has-[:checked]:border-fence-600 has-[:checked]:bg-fence-50"
              >
                <input
                  type="radio"
                  name="fenceType"
                  value={opt.value}
                  defaultChecked={opt.value === "wood_privacy"}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-center">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Linear Feet ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Linear Feet
          </label>
          <div className="relative">
            <input
              type="number"
              name="linearFeet"
              inputMode="numeric"
              required
              min={1}
              placeholder="150"
              className="w-full border border-gray-300 rounded-lg py-4 px-4 pr-12 text-lg font-medium focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              ft
            </span>
          </div>
        </div>

        {/* ── Gates ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Number of Gates
          </label>
          <input
            type="number"
            name="gateCount"
            inputMode="numeric"
            min={0}
            defaultValue={0}
            className="w-full border border-gray-300 rounded-lg py-4 px-4 text-lg font-medium focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* ── Post Spacing ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Post Spacing (ft){" "}
            <span className="text-gray-400 font-normal">
              — blank = default
            </span>
          </label>
          <input
            type="number"
            name="postSpacing"
            inputMode="decimal"
            min={4}
            max={20}
            step={0.5}
            placeholder="8"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* ── Height ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Height (ft){" "}
            <span className="text-gray-400 font-normal">
              — blank = default
            </span>
          </label>
          <input
            type="number"
            name="height"
            inputMode="decimal"
            min={3}
            max={10}
            step={0.5}
            placeholder="6"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          className="w-full bg-fence-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-fence-700 transition-colors"
        >
          Save Draft &amp; Preview
        </button>
      </form>

      {/* Client toggle for new-customer fields */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[name=customerId]').addEventListener('change',function(e){document.getElementById('newCustFields').classList.toggle('hidden',e.target.value!=='__new__')});`,
        }}
      />
    </>
  );
}
