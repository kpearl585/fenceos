'use client'
import { useState } from 'react'

const ARTICLES = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I create my first estimate?', a: 'Go to Estimates → New Estimate. Enter customer info, select materials, set your margin, and click Generate Estimate. Your quote is ready in under 5 minutes.' },
      { q: 'How do I add a customer?', a: 'Go to Customers → New Customer. Enter their name, address (use autocomplete), phone, and email. Customers are linked to estimates and jobs automatically.' },
      { q: 'How do I invite a team member?', a: 'Go to Settings → Team Members → Invite. Enter their email and select a role: Sales (can create estimates) or Foreman (can view jobs and update status).' },
    ]
  },
  {
    category: 'Estimates',
    items: [
      { q: 'How do I send an estimate to a customer?', a: 'Open the estimate → click Share. You can copy the link or send it directly to their email. Customers can view, accept, and sign digitally.' },
      { q: 'What happens when a customer accepts?', a: 'You get an email notification instantly. The estimate status updates to Accepted and a Job is automatically created in your Jobs board.' },
      { q: 'Can I edit an estimate after sending?', a: 'Yes — open the estimate and click Edit. Note: if the customer has already accepted, editing will require re-sending the quote.' },
    ]
  },
  {
    category: 'Jobs',
    items: [
      { q: 'How does the job board work?', a: 'Jobs move through three stages: Scheduled → Active → Complete. Drag the job card to update its status, or use the status buttons on the job detail page.' },
      { q: 'How do I assign a foreman?', a: "Open the job → click Assign Foreman. Select from your team members with the Foreman role. They'll receive an email with job details." },
      { q: 'How do I handle change orders?', a: 'Open the job → Change Orders tab → Add Change Order. Enter the description and amount. The job total updates automatically.' },
    ]
  },
  {
    category: 'Billing & Account',
    items: [
      { q: 'How do I upgrade my plan?', a: 'Go to Settings → Plan & Billing → Upgrade, or click the upgrade banner in your dashboard. Choose monthly or annual billing.' },
      { q: 'How do I cancel my subscription?', a: 'Go to Settings → Plan & Billing → Manage Billing. You can cancel anytime — access continues until the end of your billing period.' },
      { q: 'I have a question not answered here.', a: "Email us at support@fenceestimatepro.com and we'll get back to you within 1 business day." },
    ]
  },
]

export default function HelpModule() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50,
          width: '48px', height: '48px', borderRadius: '50%',
          background: '#2D6A4F', color: '#fff', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(45,106,79,0.4)', transition: 'transform 0.2s',
          fontSize: '1.25rem', fontWeight: 700,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        aria-label="Help"
      >
        ?
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 51 }}
        />
      )}

      {/* Slide-out panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '95vw',
        background: '#fff', zIndex: 52, boxShadow: '-4px 0 40px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2D6A4F', color: '#fff' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Help Center</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.2rem' }}>FenceEstimatePro</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>x</button>
        </div>

        {/* Quick links */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Quick Actions</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'New Estimate', href: '/dashboard/estimates/new' },
              { label: 'Add Customer', href: '/dashboard/customers/new' },
              { label: 'View Jobs', href: '/dashboard/jobs' },
              { label: 'Upgrade Plan', href: '/dashboard/upgrade' },
            ].map(l => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: '0.8rem', color: '#2D6A4F', background: '#dcfce7', padding: '0.35rem 0.75rem', borderRadius: '100px', textDecoration: 'none', fontWeight: 500 }}>{l.label}</a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ padding: '1.5rem', flex: 1 }}>
          {ARTICLES.map(section => (
            <div key={section.category} style={{ marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 600 }}>{section.category}</div>
              {section.items.map(item => (
                <div key={item.q} style={{ borderBottom: '1px solid #f3f4f6', marginBottom: '0.25rem' }}>
                  <button
                    onClick={() => setExpanded(expanded === item.q ? null : item.q)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.875rem 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
                  >
                    <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500, lineHeight: 1.4 }}>{item.q}</span>
                    <span style={{ color: '#9ca3af', flexShrink: 0, fontSize: '0.75rem' }}>{expanded === item.q ? '▲' : '▼'}</span>
                  </button>
                  {expanded === item.q && (
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.7, paddingBottom: '1rem' }}>{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Contact */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginTop: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534', marginBottom: '0.4rem' }}>Still need help?</div>
            <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: '#15803d' }}>We typically respond within 1 business day.</div>
            <a href="mailto:support@fenceestimatepro.com" style={{ fontSize: '0.85rem', color: '#2D6A4F', fontWeight: 600, textDecoration: 'none' }}>support@fenceestimatepro.com →</a>
          </div>
        </div>
      </div>
    </>
  )
}
