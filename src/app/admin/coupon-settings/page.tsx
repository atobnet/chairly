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
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: '#ffffff', color: '#111111' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', background: '#111111', color: '#ffffff', padding: '3px 10px', fontWeight: 300 }}>ADMIN</span>
        </div>
        <div className="flex items-center justify-between mb-12">
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem' }}>COUPON SETTINGS</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 100, letterSpacing: '0.04em' }}>クーポン設定</h1>
          </div>
          <Link href="/admin" style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, textDecoration: 'none', borderBottom: '1px solid #ebebeb', paddingBottom: '2px' }}>
            ← 管理画面へ
          </Link>
        </div>

        <div className="space-y-6">
          {settings.map(s => (
            <div key={s.id} style={{ border: '1px solid #ebebeb', padding: '1.5rem' }}>
              {/* ヘッダー: タイトル + ON/OFF */}
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontSize: '1rem', fontWeight: 300 }}>{LABEL[s.coupon_type]}</h2>
                <button
                  onClick={() => update(s.id, 'is_active', !s.is_active)}
                  style={{
                    fontSize: '0.65rem', letterSpacing: '0.15em', fontWeight: 300,
                    padding: '4px 14px', cursor: 'pointer',
                    background: s.is_active ? '#111111' : 'transparent',
                    color: s.is_active ? '#ffffff' : '#999999',
                    border: `1px solid ${s.is_active ? '#111111' : '#ebebeb'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {s.is_active ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="space-y-5" style={{ opacity: s.is_active ? 1 : 0.4, pointerEvents: s.is_active ? 'auto' : 'none' }}>
                {/* 割引タイプ */}
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem' }}>割引タイプ</p>
                  <div className="flex gap-2">
                    {(['amount', 'rate'] as const).map(t => (
                      <button key={t} onClick={() => update(s.id, 'discount_type', t)}
                        style={{
                          fontSize: '0.75rem', fontWeight: 300, padding: '4px 14px', cursor: 'pointer',
                          background: s.discount_type === t ? '#111111' : 'transparent',
                          color: s.discount_type === t ? '#ffffff' : '#999999',
                          border: `1px solid ${s.discount_type === t ? '#111111' : '#ebebeb'}`,
                        }}>
                        {t === 'amount' ? '固定額' : '%割引'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 割引額 */}
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem' }}>
                    {s.discount_type === 'amount' ? '割引額（円）' : '割引率（%）'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.875rem', color: '#999999' }}>{s.discount_type === 'amount' ? '¥' : ''}</span>
                    <input
                      type="number" min={0} value={s.discount_value}
                      onChange={e => update(s.id, 'discount_value', Number(e.target.value))}
                      style={{
                        width: '120px', padding: '6px 0', fontSize: '0.875rem', fontWeight: 300,
                        border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none',
                        background: 'transparent', color: '#111111',
                      }}
                    />
                    {s.discount_type === 'rate' && <span style={{ fontSize: '0.875rem', color: '#999999' }}>%</span>}
                  </div>
                </div>

                {/* 原資負担 */}
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem' }}>原資負担</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'chairly', label: 'Chairly全額' },
                      { value: 'split', label: '折半' },
                      { value: 'hairdresser', label: '美容師負担' },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => update(s.id, 'funding_type', opt.value)}
                        style={{
                          fontSize: '0.7rem', fontWeight: 300, padding: '4px 12px', cursor: 'pointer',
                          background: s.funding_type === opt.value ? '#111111' : 'transparent',
                          color: s.funding_type === opt.value ? '#ffffff' : '#999999',
                          border: `1px solid ${s.funding_type === opt.value ? '#111111' : '#ebebeb'}`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 有効期限 */}
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem' }}>有効期限（日数）</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} value={s.expires_days}
                      onChange={e => update(s.id, 'expires_days', Number(e.target.value))}
                      style={{
                        width: '80px', padding: '6px 0', fontSize: '0.875rem', fontWeight: 300,
                        border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none',
                        background: 'transparent', color: '#111111',
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#999999' }}>日</span>
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
              fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 300,
              padding: '0.75rem 2.5rem', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#111111', color: '#ffffff', border: 'none',
              opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            設定を保存
          </button>
          {saved && <span style={{ fontSize: '0.75rem', color: '#4a7c59', fontWeight: 300 }}>保存しました</span>}
        </div>
      </div>
    </div>
  )
}
