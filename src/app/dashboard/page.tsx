import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">FenceOS Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Welcome back</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-lg border border-gray-200 p-5"
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
