'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, X, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

const EQUIPMENT_OPTIONS = ['シャンプー台', 'カラーチェア', 'スチーマー', 'パーマ機器', 'ドライヤー', 'セット面', 'ウォッシュボウル', 'ホットペッパー加盟']
const AREAS = ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '墨田区', '江東区', '葛飾区', '江戸川区', '足立区', '荒川区', '北区', '板橋区', '練馬区', '杉並区', '中野区', '渋谷区', '西東京市']

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

      const { data } = await supabase
        .from('salons')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setAddress(data.address || '')
        setArea(data.area || '渋谷区')
        setDescription(data.description || '')
        setPricePerHour(data.price_per_hour || 2000)
        setEquipment(data.equipment || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('salons')
      .upsert({
        id: user.id,
        address,
        area,
        description,
        price_per_hour: pricePerHour,
        equipment,
      })

    if (!error) {
      // Also update the profile name if needed
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">スペース情報編集</h1>
        <p className="text-slate-400 mb-8">美容師に向けてスペース情報を公開します</p>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-slate-700 p-6 space-y-4" style={{ background: '#1E293B' }}>
            <h2 className="font-semibold text-white">基本情報</h2>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">住所</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="東京都渋谷区○○ 1-2-3"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">エリア（区）</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              >
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">スペース説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="スペースの特徴、アクセス方法など"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                style={{ background: '#0F172A' }}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">時間単価（円）</label>
              <input
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Number(e.target.value))}
                min={0}
                step={100}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 p-6" style={{ background: '#1E293B' }}>
            <h2 className="font-semibold text-white mb-3">設備</h2>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    equipment.includes(item)
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {equipment.includes(item) && <span className="mr-1">✓</span>}
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-2.5 rounded-lg text-slate-300 border border-slate-600 hover:border-slate-400 text-sm font-medium transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saved ? '保存しました！' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
