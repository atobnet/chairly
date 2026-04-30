'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const DESIGNS = [
  { id: 'design_1', label: 'ミニマル・ホワイト', bg: 'linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%)', textColor: '#333333', accent: '#999999' },
  { id: 'design_2', label: 'ボタニカル・グリーン', bg: 'linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%)', textColor: '#2e7d32', accent: '#4caf50' },
  { id: 'design_3', label: 'ネイビー・ゴールド', bg: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', textColor: '#ffd54f', accent: '#ffb300' },
  { id: 'design_4', label: 'ピンク・フローラル', bg: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%)', textColor: '#880e4f', accent: '#e91e63' },
  { id: 'design_5', label: 'モノクローム・アート', bg: 'linear-gradient(135deg, #212121 0%, #424242 100%)', textColor: '#eeeeee', accent: '#bdbdbd' },
]

interface GuestStampRow {
  id: string
  guest_id: string
  stamp_count: number
  total_stamps: number
  profiles: { name: string } | null
}

export function StampCardPreview({
  design, stampsRequired, stampCount = 0, rewardDescription,
}: {
  design: string; stampsRequired: number; stampCount?: number; rewardDescription: string
}) {
  const d = DESIGNS.find(x => x.id === design) || DESIGNS[0]
  return (
    <div style={{
      background: d.bg, borderRadius: '0.75rem', padding: '1.5rem', minHeight: '9rem',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: d.textColor, fontWeight: 300, opacity: 0.7 }}>STAMP CARD</span>
        <span style={{ fontSize: '0.65rem', color: d.accent, fontWeight: 400 }}>{stampCount}/{stampsRequired}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
        {Array.from({ length: stampsRequired }).map((_, i) => (
          <div key={i} style={{
            width: '1.4rem', height: '1.4rem', borderRadius: '50%',
            background: i < stampCount ? d.accent : 'transparent',
            border: `1.5px solid ${d.accent}`,
            opacity: i < stampCount ? 1 : 0.4,
          }} />
        ))}
      </div>
      <div>
        <p style={{ fontSize: '0.7rem', color: d.textColor, fontWeight: 300, opacity: 0.85 }}>
          {rewardDescription || '特典内容を設定してください'}
        </p>
      </div>
    </div>
  )
}

export default function StampCardSettingsPage() {
  const [isActive, setIsActive] = useState(true)
  const [stampsRequired, setStampsRequired] = useState(10)
  const [rewardDescription, setRewardDescription] = useState('')
  const [cardDesign, setCardDesign] = useState('design_1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [guestStamps, setGuestStamps] = useState<GuestStampRow[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: card }, { data: stamps }] = await Promise.all([
        supabase.from('stamp_cards').select('*').eq('hairdresser_id', user.id).maybeSingle(),
        supabase.from('guest_stamps').select('*, profiles!guest_id(name)').eq('hairdresser_id', user.id).order('stamp_count', { ascending: false }).limit(20),
      ])

      if (card) {
        setIsActive(card.is_active)
        setStampsRequired(card.stamps_required)
        setRewardDescription(card.reward_description || '')
        setCardDesign(card.card_design || 'design_1')
      }
      setGuestStamps((stamps || []) as GuestStampRow[])
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('stamp_cards').upsert(
      { hairdresser_id: user.id, is_active: isActive, stamps_required: stampsRequired, reward_description: rewardDescription, card_design: cardDesign },
      { onConflict: 'hairdresser_id' }
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const underlineInput: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0', fontSize: '0.875rem', border: 'none',
    borderBottom: '1px solid #ebebeb', outline: 'none', background: 'transparent',
    color: '#111111', fontWeight: 300, letterSpacing: '0.04em',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>STAMP CARD</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>スタンプカード設定</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          {/* ON/OFF */}
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1rem', fontWeight: 300 }}>STATUS</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <div
                onClick={() => setIsActive(v => !v)}
                style={{
                  width: '2.75rem', height: '1.5rem', borderRadius: '9999px',
                  background: isActive ? '#111111' : '#e0e0e0',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: '0.2rem',
                  left: isActive ? '1.45rem' : '0.2rem',
                  width: '1.1rem', height: '1.1rem', borderRadius: '50%', background: '#ffffff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                {isActive ? 'スタンプカード有効' : '無効（ゲストに表示されません）'}
              </span>
            </label>
          </div>

          {/* 設定 */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>SETTINGS</p>
            <div className="space-y-8">
              <div>
                <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>
                  特典付与スタンプ数
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {[5, 8, 10, 12, 15, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStampsRequired(n)}
                      style={{
                        width: '2.5rem', height: '2.5rem', border: stampsRequired === n ? '1px solid #111111' : '1px solid #ebebeb',
                        background: stampsRequired === n ? '#111111' : 'transparent',
                        color: stampsRequired === n ? '#ffffff' : '#999999',
                        cursor: 'pointer', fontWeight: 300, fontSize: '0.875rem',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>
                  特典内容
                </label>
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={e => setRewardDescription(e.target.value)}
                  placeholder="例: 次回1,000円OFF"
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')}
                  onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}
                />
              </div>
            </div>
          </div>

          {/* デザイン選択 */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>CARD DESIGN</p>
            <div className="grid grid-cols-1 gap-4">
              {DESIGNS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setCardDesign(d.id)}
                  style={{
                    border: cardDesign === d.id ? '2px solid #111111' : '2px solid transparent',
                    padding: '0.5rem',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <StampCardPreview
                    design={d.id}
                    stampsRequired={stampsRequired}
                    stampCount={3}
                    rewardDescription={rewardDescription || '特典内容を設定してください'}
                  />
                  <p style={{ fontSize: '0.65rem', color: cardDesign === d.id ? '#111111' : '#999999', marginTop: '0.5rem', fontWeight: 300, letterSpacing: '0.1em', textAlign: 'center' }}>
                    {d.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 保存 */}
          <div className="flex gap-4" style={{ borderTop: '1px solid #ebebeb', paddingTop: '2rem' }}>
            <button type="button" onClick={() => router.push('/dashboard')}
              style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
              戻る
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#ffffff', background: '#111111', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: saving ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saved ? '保存しました' : '保存する'}
            </button>
          </div>
        </form>

        {/* ゲストスタンプ一覧 */}
        {guestStamps.length > 0 && (
          <div style={{ marginTop: '4rem', borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>GUEST STAMPS</p>
            <div style={{ border: '1px solid #ebebeb' }}>
              {guestStamps.map((gs, i) => (
                <div key={gs.id} className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: i < guestStamps.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                  <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                    {gs.profiles?.name || 'ゲスト'}
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300 }}>
                      現在 {gs.stamp_count}/{stampsRequired}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#cccccc', fontWeight: 300 }}>
                      累計 {gs.total_stamps}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
