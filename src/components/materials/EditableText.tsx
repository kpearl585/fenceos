'use client'
import { useState, useRef, useEffect } from 'react'
import { updateMaterialField } from '@/app/dashboard/materials/actions'

interface Props {
  materialId: string
  orgId: string
  field: 'name' | 'supplier' | 'sku'
  value: string
  placeholder?: string
  className?: string
}

export default function EditableText({ materialId, orgId, field, value, placeholder, className }: Props) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function handleSave() {
    const val = inputRef.current?.value?.trim() || ''
    if (val === current) { setEditing(false); return }
    setSaving(true)
    const result = await updateMaterialField(materialId, orgId, field, val)
    setSaving(false)
    if (!result.error) setCurrent(val)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={current}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder={placeholder}
        style={{
          padding: '0.25rem 0.375rem',
          border: '2px solid #2D6A4F', borderRadius: '4px',
          fontSize: '0.875rem', fontWeight: 500, outline: 'none',
          width: '100%', minWidth: '80px', maxWidth: '160px'
        }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={className}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0.25rem 0.5rem', borderRadius: '4px',
        fontSize: '0.875rem', fontWeight: field === 'name' ? 600 : 400,
        color: field === 'name' ? '#1a2e1e' : '#6b7280',
        transition: 'background 0.15s', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: '0.25rem'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {current || <span style={{ color: '#d1d5db' }}>{placeholder || '—'}</span>}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  )
}
