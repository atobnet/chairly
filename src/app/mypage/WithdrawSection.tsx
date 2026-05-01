'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WithdrawSection() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleWithdraw() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/withdraw', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '退会処理に失敗しました。')
        return
      }
      router.push('/account/withdraw-pending')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="mt-16 pt-8" style={{ borderTop: '1px solid #ebebeb' }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#999999',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          退会する
        </button>
      </section>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1.5rem',
          }}
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '2.5rem',
              maxWidth: '420px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#cccccc', marginBottom: '0.75rem' }}>
              WITHDRAW
            </p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 300, marginBottom: '1.5rem' }}>退会の確認</h2>

            <p style={{ fontSize: '0.82rem', lineHeight: 1.8, color: '#444444', marginBottom: '1.5rem' }}>
              退会すると、14日間の猶予期間後にアカウントが完全に削除されます。
              <br />
              予約履歴・スタンプ・クーポンはすべて失われます。
            </p>

            {error && (
              <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  background: 'none',
                  border: '1px solid #ebebeb',
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                style={{
                  background: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.8rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  letterSpacing: '0.05em',
                }}
              >
                {loading ? '処理中...' : '退会する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
