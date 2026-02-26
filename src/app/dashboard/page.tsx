import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cards = [
    { title: "Estimates", note: "coming next" },
    { title: "Jobs", note: "coming next" },
    { title: "Margin Dashboard", note: "coming next" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-fence-900">FenceOS Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-fence-600">{user.email}</span>
            <form>
              <button
                formAction={logout}
                className="px-3 py-1.5 text-sm bg-fence-100 hover:bg-fence-200 text-fence-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold mb-4">Welcome back</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-fence-900">{card.title}</h3>
              <p className="text-sm text-gray-400 mt-1">{card.note}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
