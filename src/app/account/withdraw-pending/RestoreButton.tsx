'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RestoreButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRestore() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/restore', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '取り消しに失敗しました。')
        return
      }
      router.push('/mypage')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>
      )}
      <button
        onClick={handleRestore}
        disabled={loading}
        style={{
          background: '#111111',
          color: '#ffffff',
          border: 'none',
          padding: '0.75rem 2rem',
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '処理中...' : '退会を取り消す'}
      </button>
    </div>
  )
}
