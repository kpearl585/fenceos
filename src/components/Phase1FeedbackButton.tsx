'use client'

/**
 * Phase 1 Estimator - Feedback Button
 * Lightweight feedback capture for beta users
 */

import { useState } from 'react'

interface Props {
  designId: string
}

export default function Phase1FeedbackButton({ designId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'issue' | 'suggestion' | 'question'>('issue')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback/phase1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: feedbackType,
          message: message.trim(),
          design_id: designId,
          page_url: window.location.href
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setMessage('')
      }, 2000)

    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
      console.error('Feedback submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-accent hover:bg-accent-light accent-glow text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors duration-150"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Report Issue / Feedback
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 bg-surface-2 rounded-lg shadow-xl w-96 max-w-[calc(100vw-3rem)] border border-border">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h3 className="font-semibold text-text">Send Feedback</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted hover:text-text transition-colors duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-accent-light mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text font-semibold">Thank you!</p>
            <p className="text-muted text-sm">Feedback submitted successfully</p>
          </div>
        ) : (
          <>
            {/* Feedback Type */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wider">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackType('issue')}
                  className={`flex-1 px-3 py-2 text-sm rounded border transition-colors duration-150 ${
                    feedbackType === 'issue'
                      ? 'bg-danger/10 border-danger/30 text-danger'
                      : 'bg-surface-3 border-border text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  🐛 Issue
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('suggestion')}
                  className={`flex-1 px-3 py-2 text-sm rounded border transition-colors duration-150 ${
                    feedbackType === 'suggestion'
                      ? 'bg-accent/15 border-accent/30 text-accent-light'
                      : 'bg-surface-3 border-border text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  💡 Idea
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('question')}
                  className={`flex-1 px-3 py-2 text-sm rounded border transition-colors duration-150 ${
                    feedbackType === 'question'
                      ? 'bg-warning/10 border-warning/30 text-warning'
                      : 'bg-surface-3 border-border text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  ❓ Question
                </button>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={4}
                className="w-full px-3 py-2 border border-border bg-surface-3 text-text rounded-md placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-colors duration-150"
                disabled={submitting}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full bg-accent hover:bg-accent-light accent-glow disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition-colors duration-150"
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>

            <p className="text-xs text-muted text-center">
              Your feedback helps us improve the estimator
            </p>
          </>
        )}
      </form>
    </div>
  )
}
