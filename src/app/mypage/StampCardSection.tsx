'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { StampCardPreview } from '@/app/hairdresser/stamp-card/page'

interface StampItem {
  id: string
  hairdresser_id: string
  stamp_count: number
  total_stamps: number
  stamp_cards: {
    stamps_required: number
    reward_description: string
    card_design: string
    is_active: boolean
  } | null
  hairdressers: {
    profiles: { name: string } | null
  } | null
}

export default function StampCardSection({ stamps }: { stamps: StampItem[] }) {
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [localStamps, setLocalStamps] = useState(stamps)

  const handleRedeem = async (hairdresserId: string) => {
    setRedeeming(hairdresserId)
    try {
      const res = await fetch('/api/stamp/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hairdresserId }),
      })
      if (res.ok) {
        setLocalStamps(prev => prev.map(s =>
          s.hairdresser_id === hairdresserId ? { ...s, stamp_count: 0 } : s
        ))
        alert('特典クーポンを受け取りました！マイページのクーポン一覧をご確認ください。')
      } else {
        const data = await res.json()
        alert(data.error || '特典の受け取りに失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    }
    setRedeeming(null)
  }

  return (
    <div className="space-y-6">
      {localStamps.map(s => {
        if (!s.stamp_cards) return null
        const { stamps_required, reward_description, card_design } = s.stamp_cards
        const canRedeem = s.stamp_count >= stamps_required
        const hairdresserName = s.hairdressers?.profiles?.name || '美容師'

        return (
          <div key={s.id}>
            <p style={{ fontSize: '0.7rem', color: '#999999', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
              {hairdresserName}
            </p>
            <StampCardPreview
              design={card_design}
              stampsRequired={stamps_required}
              stampCount={s.stamp_count}
              rewardDescription={reward_description}
            />
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300 }}>
                累計 {s.total_stamps} スタンプ
              </p>
              {canRedeem && (
                <button
                  onClick={() => handleRedeem(s.hairdresser_id)}
                  disabled={redeeming === s.hairdresser_id}
                  style={{
                    padding: '0.5rem 1.25rem', fontSize: '0.7rem', letterSpacing: '0.1em',
                    border: '1px solid #c9b99a', color: '#c9b99a', background: 'transparent',
                    cursor: redeeming === s.hairdresser_id ? 'not-allowed' : 'pointer',
                    fontWeight: 300, display: 'flex', alignItems: 'center', gap: '0.5rem',
                    opacity: redeeming === s.hairdresser_id ? 0.5 : 1,
                  }}
                >
                  {redeeming === s.hairdresser_id && <Loader2 size={12} className="animate-spin" />}
                  特典を受け取る
                </button>
              )}
              {!canRedeem && (
                <p style={{ fontSize: '0.7rem', color: '#cccccc', fontWeight: 300 }}>
                  あと {stamps_required - s.stamp_count} スタンプで特典
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
