'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html>
      <body style={{ margin: 0, background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: '#16A34A',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 60px rgba(22,163,74,0.2), 0 0 20px rgba(22,163,74,0.1)',
          }}>
            <span style={{ color: '#080808', fontWeight: 900, fontSize: '1.5rem' }}>F</span>
          </div>
          <h2 style={{ color: '#F2F2F2', marginBottom: '0.5rem', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>We hit an unexpected error. Please try again.</p>
          <button
            onClick={reset}
            style={{
              background: '#16A34A',
              color: '#080808',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 0 60px rgba(22,163,74,0.2), 0 0 20px rgba(22,163,74,0.1)',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#22C55E' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#16A34A' }}
          >Try Again</button>
        </div>
      </body>
    </html>
  )
}
