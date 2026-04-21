import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Leads | FenceEstimatePro",
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: waitlistLeads } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: directLeads } = await supabase
    .from("Leads")
    .select("*")
    .order("created_at", { ascending: false });

  const allLeads = [
    ...(waitlistLeads || []).map(l => ({ ...l, source_table: 'waitlist' })),
    ...(directLeads || []).map(l => ({ ...l, source_table: 'Leads' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-text">Lead Management</h1>
        <p className="text-muted mt-2">All waitlist signups and contact form submissions</p>
      </div>

      <div className="bg-surface-2 rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">All Leads ({allLeads.length})</h2>
            <div className="text-sm text-muted">Last updated: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {allLeads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-muted mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text mb-1">No leads yet</h3>
            <p className="text-muted">Leads will appear here when people sign up on your website.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-3">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name / Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Follow-up</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allLeads.map((lead) => {
                  const date = new Date(lead.created_at);
                  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                  const isNew = daysAgo === 0;

                  return (
                    <tr key={lead.id} className={isNew ? "bg-accent/5" : "hover:bg-surface-3 transition-colors duration-150"}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {isNew && (
                            <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-accent/15 text-accent-light uppercase tracking-wider">NEW</span>
                          )}
                          <a href={`mailto:${lead.email}`} className="text-accent-light hover:text-accent font-medium transition-colors duration-150">
                            {lead.email}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {lead.name || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${lead.source_table === 'waitlist' ? 'bg-accent/15 text-accent-light' : 'bg-surface-3 text-muted'}`}>
                          {lead.source || lead.source_table}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        <div>{date.toLocaleDateString()}</div>
                        <div className="text-xs text-muted">{daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {lead.day3_sent ? <span className="text-accent-light">✓ Day 3 sent</span>
                         : lead.day7_sent ? <span className="text-accent-light">✓ Day 7 sent</span>
                         : <span className="text-muted">Pending</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href={`mailto:${lead.email}?subject=Welcome to FenceEstimatePro&body=Hi ${lead.name || 'there'},%0D%0A%0D%0AThanks for your interest in FenceEstimatePro!`}
                           className="text-accent-light hover:text-accent transition-colors duration-150">
                          Send Email
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-accent/5 border border-accent/20 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-accent-light" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-accent-light">Email Notifications</h3>
            <div className="mt-2 text-sm text-muted">
              <p>All waitlist signups are automatically sent to <strong className="text-text">Pearllabs@icloud.com</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
