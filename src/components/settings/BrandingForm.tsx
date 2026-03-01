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
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              style={{ width: '48px', height: '40px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>{primaryColor}</span>
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              style={{ width: '48px', height: '40px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>{accentColor}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer Note</label>
          <input name="footer_note" type="text" defaultValue={initialFooterNote} placeholder="Licensed & Insured" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Logo Upload — handles its own Supabase upsert */}
      <LogoUpload orgId={orgId} currentLogoUrl={initialLogoUrl} />

      <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700">
        Save Branding
      </button>
    </form>
  )
}
