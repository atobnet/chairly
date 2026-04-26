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

  const inputCls = "w-full px-4 py-3 text-sm border focus:outline-none bg-transparent"
  const inputStyle = { borderColor: '#e2dcd4', color: '#1a1410' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>EDIT SPACE</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>スペース情報編集</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          <div>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>LOCATION</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>ADDRESS</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} required placeholder="東京都渋谷区○○ 1-2-3" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>AREA</label>
                <select value={area} onChange={e => setArea(e.target.value)} className={inputCls} style={inputStyle}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>DESCRIPTION</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="スペースの特徴、アクセス方法など" className="w-full px-4 py-3 text-sm border focus:outline-none resize-none bg-transparent" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>PRICE PER HOUR (¥)</label>
                <input type="number" value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} min={0} step={100} className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="border-t pt-12" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>EQUIPMENT</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item])}
                  className="px-4 py-2 text-xs border transition-all"
                  style={{
                    borderColor: equipment.includes(item) ? '#1a1410' : '#e2dcd4',
                    background: equipment.includes(item) ? '#1a1410' : 'transparent',
                    color: equipment.includes(item) ? '#f7f4ef' : '#6b6459',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 border-t pt-8" style={{ borderColor: '#e2dcd4' }}>
            <button type="button" onClick={() => router.push('/dashboard')} className="flex-1 py-3 text-xs tracking-widest border" style={{ borderColor: '#e2dcd4', color: '#a09890' }}>
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-xs tracking-widest border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef] disabled:opacity-50 flex items-center justify-center gap-2" style={{ borderColor: '#1a1410', color: '#1a1410' }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saved ? '保存しました' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
