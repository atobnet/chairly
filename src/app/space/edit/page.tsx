'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const EQUIPMENT_OPTIONS = ['シャンプー台', 'カラーチェア', 'スチーマー', 'パーマ機器', 'ドライヤー', 'セット面', 'ウォッシュボウル', 'Wi-Fi', '駐車場']
const AREAS = ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '墨田区', '江東区', '葛飾区', '足立区', '杉並区', '中野区']

export default function SpaceEditPage() {
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('渋谷区')
  const [description, setDescription] = useState('')
  const [pricePerHour, setPricePerHour] = useState(2000)
  const [equipment, setEquipment] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('salons').select('*').eq('id', user.id).single()
      if (data) { setAddress(data.address || ''); setArea(data.area || '渋谷区'); setDescription(data.description || ''); setPricePerHour(data.price_per_hour || 2000); setEquipment(data.equipment || []) }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('salons').upsert({ id: user.id, address, area, description, price_per_hour: pricePerHour, equipment })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const underlineInput: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    border: 'none',
    borderBottom: '1px solid #ebebeb',
    outline: 'none',
    background: 'transparent',
    color: '#111111',
    fontWeight: 300,
    letterSpacing: '0.04em',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.6rem',
    letterSpacing: '0.3em',
    color: '#cccccc',
    marginBottom: '0.5rem',
    fontWeight: 300,
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
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>EDIT SPACE</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>スペース情報編集</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>LOCATION</p>
            <div className="space-y-8">
              <div>
                <label style={labelStyle}>ADDRESS</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  placeholder="東京都渋谷区○○ 1-2-3"
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')}
                  onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}
                />
              </div>
              <div>
                <label style={labelStyle}>AREA</label>
                <select
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')}
                  onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}
                >
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="スペースの特徴、アクセス方法など"
                  style={{ ...underlineInput, resize: 'none' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')}
                  onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}
                />
              </div>
              <div>
                <label style={labelStyle}>PRICE PER HOUR (¥)</label>
                <input
                  type="number"
                  value={pricePerHour}
                  onChange={e => setPricePerHour(Number(e.target.value))}
                  min={0}
                  step={100}
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')}
                  onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>EQUIPMENT</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item])}
                  style={{
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    border: equipment.includes(item) ? '1px solid #111111' : '1px solid #ebebeb',
                    background: equipment.includes(item) ? '#111111' : 'transparent',
                    color: equipment.includes(item) ? '#ffffff' : '#999999',
                    cursor: 'pointer',
                    fontWeight: 300,
                    transition: 'all 0.15s',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4" style={{ borderTop: '1px solid #ebebeb', paddingTop: '2rem' }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                border: '1px solid #ebebeb',
                color: '#999999',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 300,
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                border: '1px solid #111111',
                color: '#ffffff',
                background: '#111111',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 300,
                opacity: saving ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saved ? '保存しました' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
