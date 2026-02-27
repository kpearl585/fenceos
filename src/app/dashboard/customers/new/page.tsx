import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "customers")) redirect("/dashboard");
  if (profile.role === "foreman") redirect("/dashboard/customers");

  return (
    <>
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm text-fence-600 hover:text-fence-800 font-medium"
        >
          &larr; Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-fence-900 mt-2">
          New Customer
        </h1>
      </div>

      <form
        action={createCustomer}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-8 max-w-2xl space-y-5"
      >
        {/* Name (required) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="John Smith"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
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
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Address
          </label>
          <input
            name="address"
            placeholder="123 Main St"
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        {/* City / State / Zip */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              City
            </label>
            <input
              name="city"
              placeholder="Springfield"
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              State
            </label>
            <input
              name="state"
              placeholder="TX"
              maxLength={2}
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Zip
            </label>
            <input
              name="zip"
              placeholder="78701"
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
            />
          </div>
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
            className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-fence-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-fence-700 transition-colors"
        >
          Save Customer
        </button>
      </form>
    </>
  );
}
