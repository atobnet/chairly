'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, X, Save, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { MenuItem } from '@/types'

const AREAS = ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '墨田区', '江東区', '葛飾区', '足立区', '杉並区', '中野区']

export default function ProfileEditPage() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [area, setArea] = useState('渋谷区')
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menuName, setMenuName] = useState('')
  const [menuPrice, setMenuPrice] = useState(5000)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      const { data: hd } = await supabase
        .from('hairdressers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) setName(profile.name || '')
      if (hd) {
        setBio(hd.bio || '')
        setInstagramUrl(hd.instagram_url || '')
        setArea(hd.area || '渋谷区')
        setMenus(hd.menus || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const addMenu = () => {
    if (!menuName.trim()) return
    setMenus(prev => [...prev, { name: menuName.trim(), price: menuPrice }])
    setMenuName('')
    setMenuPrice(5000)
  }

  const removeMenu = (i: number) => {
    setMenus(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ name }).eq('id', user.id)
    const { error } = await supabase
      .from('hairdressers')
      .upsert({ id: user.id, bio, instagram_url: instagramUrl, area, menus })

    if (!error) {
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
        <h1 className="text-2xl font-bold text-white mb-2">プロフィール編集</h1>
        <p className="text-slate-400 mb-8">消費者に向けてプロフィールを公開します</p>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-slate-700 p-6 space-y-4" style={{ background: '#1E293B' }}>
            <h2 className="font-semibold text-white">基本情報</h2>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 花子"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">自己紹介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="経歴・得意スタイル・こだわりなど"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                style={{ background: '#0F172A' }}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">主な活動エリア</label>
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
              <label className="block text-sm text-slate-300 mb-1.5">Instagram URL</label>
              <div className="relative">
                <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ background: '#0F172A' }}
                />
              </div>
            </div>
          </div>

          {/* Menus */}
          <div className="rounded-2xl border border-slate-700 p-6" style={{ background: '#1E293B' }}>
            <h2 className="font-semibold text-white mb-4">メニュー・料金</h2>

            {menus.length > 0 && (
              <div className="space-y-2 mb-4">
                {menus.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-700" style={{ background: '#0F172A' }}>
                    <div>
                      <span className="text-white text-sm font-medium">{m.name}</span>
                      <span className="text-slate-400 text-sm ml-2">¥{m.price.toLocaleString()}</span>
                    </div>
                    <button type="button" onClick={() => removeMenu(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="メニュー名（例: カット）"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              />
              <input
                type="number"
                value={menuPrice}
                onChange={(e) => setMenuPrice(Number(e.target.value))}
                min={0}
                step={500}
                className="w-28 px-3 py-2 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                style={{ background: '#0F172A' }}
              />
              <button
                type="button"
                onClick={addMenu}
                className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
              >
                <Plus size={16} />
              </button>
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
