'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, X } from 'lucide-react'
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
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      const { data: hd } = await supabase.from('hairdressers').select('*').eq('id', user.id).single()
      if (profile) setName(profile.name || '')
      if (hd) { setBio(hd.bio || ''); setInstagramUrl(hd.instagram_url || ''); setArea(hd.area || '渋谷区'); setMenus(hd.menus || []) }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ name }).eq('id', user.id)
    await supabase.from('hairdressers').upsert({ id: user.id, bio, instagram_url: instagramUrl, area, menus })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const inputCls = "w-full px-4 py-3 text-sm border focus:outline-none transition-colors bg-transparent"
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
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>EDIT PROFILE</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>プロフィール編集</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          {/* Basic info */}
          <div>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>BASIC INFO</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="山田 花子" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>BIO</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="経歴・得意スタイル・こだわりなど" className="w-full px-4 py-3 text-sm border focus:outline-none resize-none bg-transparent" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>AREA</label>
                <select value={area} onChange={e => setArea(e.target.value)} className={inputCls} style={inputStyle}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>INSTAGRAM URL</label>
                <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Menus */}
          <div className="border-t pt-12" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>MENU & PRICE</p>

            {menus.length > 0 && (
              <div className="mb-4 border" style={{ borderColor: '#e2dcd4' }}>
                {menus.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < menus.length - 1 ? '1px solid #ede9e2' : 'none' }}>
                    <div className="text-sm">
                      <span style={{ color: '#1a1410' }}>{m.name}</span>
                      <span className="ml-4" style={{ color: '#6b7c5c' }}>¥{m.price.toLocaleString()}</span>
                    </div>
                    <button type="button" onClick={() => setMenus(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#c9b99a' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <input type="text" value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="メニュー名（例: カット）" className="flex-1 px-4 py-2.5 text-sm border focus:outline-none bg-transparent" style={inputStyle} />
              <input type="number" value={menuPrice} onChange={e => setMenuPrice(Number(e.target.value))} min={0} step={500} className="w-28 px-4 py-2.5 text-sm border focus:outline-none bg-transparent" style={inputStyle} />
              <button type="button" onClick={addMenu} className="px-4 py-2.5 border text-xs transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]" style={{ borderColor: '#1a1410', color: '#1a1410' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 border-t pt-8" style={{ borderColor: '#e2dcd4' }}>
            <button type="button" onClick={() => router.push('/dashboard')} className="flex-1 py-3 text-xs tracking-widest border transition-all" style={{ borderColor: '#e2dcd4', color: '#a09890' }}>
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
