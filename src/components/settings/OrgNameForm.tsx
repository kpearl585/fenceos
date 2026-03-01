'use client'
import { useState } from 'react'
import { updateOrgName } from '@/app/dashboard/settings/actions'

export default function OrgNameForm({ orgId, currentName }: { orgId: string; currentName: string }) {
  const [name, setName] = useState(currentName || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    const result = await updateOrgName(orgId, name)
    setSaving(false)
    setStatus(result.error ? 'error' : 'success')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
        Company Name
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400, marginLeft: '0.5rem' }}>Appears on estimates and customer-facing documents</span>
      </label>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your company name"
          style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', color: '#111827', outline: 'none' }}
        />
        <button
          onClick={handleSave}
          disabled={saving || name === currentName}
          style={{ padding: '0.625rem 1.25rem', background: saving ? '#9ca3af' : '#2D6A4F', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
        >
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
      {status === 'success' && <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>\u2713 Company name updated</span>}
      {status === 'error' && <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>Failed to save. Try again.</span>}
    </div>
  )
}
