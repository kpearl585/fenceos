'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember, removeTeamMember, updateMemberRole } from '@/app/dashboard/settings/actions'

type Member = {
  id: string
  full_name: string | null
  email: string
  role: string
  created_at: string
}

type Props = {
  members: Member[]
  orgId: string
  currentUserId: string
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-accent/15 text-accent-light',
  sales: 'bg-surface-3 text-muted',
  foreman: 'bg-warning/15 text-warning',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access — billing, settings, all jobs & estimates',
  sales: 'Estimates + customers (view jobs)',
  foreman: 'Estimates + customers + full job management',
}

export default function TeamMembersSection({ members, orgId, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'sales' | 'foreman'>('foreman')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await inviteTeamMember(orgId, inviteEmail, inviteRole)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` })
        setInviteEmail('')
      }
    })
  }

  async function handleRemove(profileId: string) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return
    startTransition(async () => {
      const result = await removeTeamMember(profileId, orgId)
      if (result.error) setMessage({ type: 'error', text: result.error })
    })
  }

  async function handleRoleChange(profileId: string, role: 'sales' | 'foreman') {
    startTransition(async () => {
      const result = await updateMemberRole(profileId, orgId, role)
      if (result.error) setMessage({ type: 'error', text: result.error })
    })
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
          <div key={role} className="flex items-start gap-2">
            <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${ROLE_BADGE[role]}`}>
              {role}
            </span>
            <span className="text-xs text-muted">{desc}</span>
          </div>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted mb-4">No team members yet.</p>
      ) : (
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider">
              <th className="text-left py-2 font-semibold text-muted">Name</th>
              <th className="text-left py-2 font-semibold text-muted">Email</th>
              <th className="text-left py-2 font-semibold text-muted">Role</th>
              <th className="text-left py-2 font-semibold text-muted">Joined</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="py-2 font-medium text-text">{m.full_name || '\u2014'}</td>
                <td className="py-2 text-muted">{m.email}</td>
                <td className="py-2">
                  {m.role === 'owner' ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${ROLE_BADGE.owner}`}>
                      owner
                    </span>
                  ) : (
                    <select
                      defaultValue={m.role}
                      disabled={isPending}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as 'sales' | 'foreman')}
                      className="text-xs font-semibold px-2 py-0.5 rounded border border-border bg-surface-3 text-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
                    >
                      <option value="sales">sales</option>
                      <option value="foreman">foreman</option>
                    </select>
                  )}
                </td>
                <td className="py-2 text-muted text-xs">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 text-right">
                  {m.role !== 'owner' && m.id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={isPending}
                      className="text-xs text-danger hover:text-danger/80 font-medium disabled:opacity-50 transition-colors duration-150"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text mb-3">Invite Team Member</h3>
        {message && (
          <div className={`mb-3 p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-danger/10 text-danger border border-danger/30' : 'bg-accent/10 text-accent-light border border-accent/30'}`}>
            {message.type === 'error' ? ' ' : ' '}{message.text}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'sales' | 'foreman')}
            className="border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          >
            <option value="foreman">Foreman</option>
            <option value="sales">Sales</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
          >
            {isPending ? 'Sending\u2026' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  )
}
