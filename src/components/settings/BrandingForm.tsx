'use client'
import { useState } from 'react'
import { saveBranding } from '@/app/dashboard/settings/actions'
import LogoUpload from './LogoUpload'

interface BrandingFormProps {
  orgId: string
  initialPrimaryColor?: string
  initialAccentColor?: string
  initialLogoUrl?: string
  initialFooterNote?: string
}

export default function BrandingForm({
  orgId,
  initialPrimaryColor = '#2D6A4F',
  initialAccentColor = '#4ade80',
  initialLogoUrl = '',
  initialFooterNote = '',
}: BrandingFormProps) {
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor)
  const [accentColor, setAccentColor] = useState(initialAccentColor)

  return (
    <form action={saveBranding} className="space-y-4">
      {/* Hidden inputs carry the color values to the server action */}
      <input type="hidden" name="primary_color" value={primaryColor} />
      <input type="hidden" name="accent_color" value={accentColor} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Color */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-12 h-10 p-0.5 border border-border bg-surface-3 rounded-md cursor-pointer"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="w-12 h-10 p-0.5 border border-border bg-surface-3 rounded-md cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Note */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">Footer Note</label>
          <input name="footer_note" type="text" defaultValue={initialFooterNote} placeholder="Licensed & Insured" className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150" />
        </div>
      </div>

      {/* Logo Upload — handles its own Supabase upsert */}
      <LogoUpload orgId={orgId} currentLogoUrl={initialLogoUrl} />

      <button type="submit" className="bg-accent hover:bg-accent-light accent-glow text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
        Save Branding
      </button>
    </form>
  )
}
