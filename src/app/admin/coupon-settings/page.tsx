'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface CouponSetting {
  id: string
  coupon_type: 'first_time' | 'second_time'
  is_active: boolean
  discount_type: 'amount' | 'rate'
  discount_value: number
  funding_type: 'chairly' | 'split' | 'hairdresser'
  expires_days: number
}

const LABEL: Record<string, string> = {
  first_time: '初回利用クーポン',
  second_time: '2回目利用クーポン',
}

const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#333333', marginBottom: '0.5rem', display: 'block' } as const
const inputStyle = {
  width: '120px', padding: '6px 8px', fontSize: '0.9rem', fontWeight: 400,
  border: '1px solid #cccccc', outline: 'none', background: '#ffffff', color: '#111111',
} as const

export default function CouponSettingsPage() {
  const [settings, setSettings] = useState<CouponSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('coupon_settings').select('*').order('coupon_type').then(({ data }) => {
      if (data) setSettings(data as CouponSetting[])
      setLoading(false)
    })
  }, [supabase])

  const update = (id: string, field: keyof CouponSetting, value: unknown) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    for (const s of settings) {
      await supabase.from('coupon_settings').update({
        is_active: s.is_active,
        discount_type: s.discount_type,
        discount_value: s.discount_value,
        funding_type: s.funding_type,
        expires_days: s.expires_days,
        updated_at: new Date().toISOString(),
      }).eq('id', s.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin" size={20} style={{ color: '#666666' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: '#f9f9f9', color: '#111111' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', background: '#111111', color: '#ffffff', padding: '4px 12px', fontWeight: 500 }}>ADMIN</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>クーポン設定</h1>
          </div>
          <Link href="/admin" style={{ fontSize: '0.8rem', color: '#555555', fontWeight: 500, textDecoration: 'none' }}>
            ← 管理画面へ
          </Link>
        </div>

        <div className="space-y-6">
          {settings.map(s => (
            <div key={s.id} style={{ border: '1px solid #dddddd', background: '#ffffff', padding: '1.5rem' }}>
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111111' }}>{LABEL[s.coupon_type]}</h2>
                <button
                  onClick={() => update(s.id, 'is_active', !s.is_active)}
                  style={{
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
                    padding: '5px 16px', cursor: 'pointer',
                    background: s.is_active ? '#111111' : '#ffffff',
                    color: s.is_active ? '#ffffff' : '#666666',
                    border: `2px solid ${s.is_active ? '#111111' : '#aaaaaa'}`,
                  }}
                >
                  {s.is_active ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="space-y-5" style={{ opacity: s.is_active ? 1 : 0.45, pointerEvents: s.is_active ? 'auto' : 'none' }}>
                {/* 割引タイプ */}
                <div>
                  <span style={labelStyle}>割引タイプ</span>
                  <div className="flex gap-2">
                    {(['amount', 'rate'] as const).map(t => (
                      <button key={t} onClick={() => update(s.id, 'discount_type', t)}
                        style={{
                          fontSize: '0.8rem', fontWeight: 600, padding: '5px 16px', cursor: 'pointer',
                          background: s.discount_type === t ? '#111111' : '#ffffff',
                          color: s.discount_type === t ? '#ffffff' : '#555555',
                          border: `2px solid ${s.discount_type === t ? '#111111' : '#cccccc'}`,
                        }}>
                        {t === 'amount' ? '固定額（円）' : '%割引'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 割引額 */}
                <div>
                  <span style={labelStyle}>{s.discount_type === 'amount' ? '割引額（円）' : '割引率（%）'}</span>
                  <div className="flex items-center gap-2">
                    {s.discount_type === 'amount' && <span style={{ fontSize: '1rem', color: '#333333', fontWeight: 600 }}>¥</span>}
                    <input
                      type="number" min={0} value={s.discount_value}
                      onChange={e => update(s.id, 'discount_value', Number(e.target.value))}
                      style={inputStyle}
                    />
                    {s.discount_type === 'rate' && <span style={{ fontSize: '0.9rem', color: '#333333', fontWeight: 600 }}>%</span>}
                  </div>
                </div>

                {/* 原資負担 */}
                <div>
                  <span style={labelStyle}>原資負担</span>
                  <div className="flex gap-2">
                    {([
                      { value: 'chairly', label: 'Chairly全額' },
                      { value: 'split', label: '折半' },
                      { value: 'hairdresser', label: '美容師負担' },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => update(s.id, 'funding_type', opt.value)}
                        style={{
                          fontSize: '0.8rem', fontWeight: 600, padding: '5px 14px', cursor: 'pointer',
                          background: s.funding_type === opt.value ? '#111111' : '#ffffff',
                          color: s.funding_type === opt.value ? '#ffffff' : '#555555',
                          border: `2px solid ${s.funding_type === opt.value ? '#111111' : '#cccccc'}`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 有効期限 */}
                <div>
                  <span style={labelStyle}>有効期限（日数）</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} value={s.expires_days}
                      onChange={e => update(s.id, 'expires_days', Number(e.target.value))}
                      style={{ ...inputStyle, width: '80px' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#333333', fontWeight: 600 }}>日</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSave} disabled={saving}
            style={{
              fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em',
              padding: '0.75rem 2.5rem', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#111111', color: '#ffffff', border: 'none',
              opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            設定を保存
          </button>
          {saved && <span style={{ fontSize: '0.875rem', color: '#2a7c4a', fontWeight: 600 }}>✓ 保存しました</span>}
        </div>
      </div>
    </div>
  )
}
