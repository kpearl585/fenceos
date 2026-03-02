'use client'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '48px', height: '48px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}></div>
        <h2 style={{ color: '#111827', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>We hit an unexpected error loading this page. Your data is safe.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={reset} style={{ background: '#2D6A4F', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>Try Again</button>
          <a href="/dashboard" style={{ background: '#f3f4f6', color: '#374151', padding: '0.625rem 1.25rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Go to Dashboard</a>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>Need help? Email <a href="mailto:support@fenceestimatepro.com" style={{ color: '#2D6A4F' }}>support@fenceestimatepro.com</a></p>
      </div>
    </div>
  )
}
