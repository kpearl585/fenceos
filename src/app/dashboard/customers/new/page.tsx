import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import CustomerForm from "./CustomerForm";

export default async function NewCustomerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "customers")) redirect("/dashboard");
  if (profile.role === "foreman") redirect("/dashboard/customers");

  return (
    <>
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm text-accent-light hover:text-accent font-medium transition-colors duration-150"
        >
          ← Back to Customers
        </Link>
        <h1 className="font-display text-2xl font-bold text-text mt-2">New Customer</h1>
      </div>
      <CustomerForm />
    </>
  );
}
