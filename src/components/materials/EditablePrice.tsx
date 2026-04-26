'use client'
import { useState, useRef, useEffect } from 'react'
import { updateMaterialPrice } from '@/app/dashboard/materials/actions'

interface Props {
  materialId: string
  orgId: string
  field: 'unit_cost' | 'unit_price'
  value: number
  color?: string
}

export default function EditablePrice({ materialId, orgId, field, value, color }: Props) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function handleSave() {
    const num = parseFloat(inputRef.current?.value || '0')
    if (isNaN(num) || num === current) { setEditing(false); return }
    setSaving(true)
    const result = await updateMaterialPrice(materialId, orgId, field, num)
    setSaving(false)
    if (!result.error) setCurrent(num)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ color: '#6f786f', fontSize: '0.875rem' }}>$</span>
        <input
          ref={inputRef}
          defaultValue={current.toFixed(2)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="bg-surface-3"
          style={{
            width: '80px', padding: '0.25rem 0.375rem',
            border: '2px solid rgba(22, 163, 74, 0.7)', borderRadius: '4px',
            fontSize: '0.875rem', fontWeight: 600, outline: 'none',
            color: color || '#f5f7f5'
          }}
          type="number"
          step="0.01"
          min="0"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0.25rem 0.5rem', borderRadius: '4px',
        fontSize: '0.875rem', fontWeight: 600,
        color: color || '#f5f7f5',
        transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', gap: '0.25rem'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(18, 24, 18, 0.95)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      ${current.toFixed(2)}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6f786f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  )
}
