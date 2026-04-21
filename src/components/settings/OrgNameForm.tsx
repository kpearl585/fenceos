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
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">
        Company Name
        <span className="ml-2 text-xs font-normal text-muted normal-case tracking-normal">Appears on estimates and customer-facing documents</span>
      </label>
      <div className="flex gap-3 items-center">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your company name"
          className="flex-1 border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
        />
        <button
          onClick={handleSave}
          disabled={saving || name === currentName}
          className="bg-accent hover:bg-accent-light accent-glow text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
      {status === 'success' && <span className="text-xs text-accent-light">\u2713 Company name updated</span>}
      {status === 'error' && <span className="text-xs text-danger">Failed to save. Try again.</span>}
    </div>
  )
}
