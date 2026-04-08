'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function LogoUpload({ orgId, currentLogoUrl }: { orgId: string; currentLogoUrl?: string }) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }

    setUploading(true)
    setError('')

    const supabase = createClient()
    const path = `${orgId}/logo`
    const { error: uploadError } = await supabase.storage
      .from('org-assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError('Upload failed. Try again.')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('org-assets').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()

    const { error: saveError } = await supabase
      .from('org_branding')
      .upsert({ org_id: orgId, logo_url: url }, { onConflict: 'org_id' })

    if (saveError) {
      setError('Saved to storage but failed to update record.')
    } else {
      setLogoUrl(url)
    }
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
        Company Logo
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400, marginLeft: '0.5rem' }}>Appears on estimates and PDFs · Max 10MB</span>
      </label>

      {logoUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Company logo" style={{ height: '56px', maxWidth: '180px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem', background: '#f9fafb' }} />
          <button type="button" onClick={() => inputRef.current?.click()} style={{ fontSize: '0.8rem', color: '#2D6A4F', background: 'none', border: '1px solid #2D6A4F', padding: '0.4rem 0.875rem', borderRadius: '6px', cursor: 'pointer' }}>
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', border: '2px dashed #d1d5db', borderRadius: '8px', background: '#f9fafb', cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280', width: 'fit-content' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {uploading ? 'Uploading…' : 'Upload Logo'}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      {error && <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
