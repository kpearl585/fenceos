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
    <div className="flex flex-col gap-4">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">
        Company Logo
        <span className="ml-2 text-xs font-normal text-muted normal-case tracking-normal">Appears on estimates and PDFs &middot; Max 10MB</span>
      </label>

      {logoUrl ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Company logo" className="h-14 max-w-[180px] object-contain border border-border rounded-md p-2 bg-surface-3" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-accent-light border border-accent/30 hover:bg-accent/10 px-3 py-1.5 rounded-md font-semibold transition-colors duration-150"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-3 px-5 py-3.5 border-2 border-dashed border-border hover:border-accent/60 rounded-lg bg-surface-3 cursor-pointer text-sm text-muted hover:text-text w-fit transition-colors duration-150 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {uploading ? 'Uploading\u2026' : 'Upload Logo'}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
