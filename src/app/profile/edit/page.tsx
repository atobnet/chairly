'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, X, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { MenuItem, HairdresserSalon, Salon } from '@/types'

const AREAS = ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '墨田区', '江東区', '葛飾区', '足立区', '杉並区', '中野区']
const MENU_CATEGORIES = ['組み合わせメニュー', 'カット', 'カラー', 'パーマ', '縮毛矯正', 'その他']

export default function ProfileEditPage() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [area, setArea] = useState('渋谷区')
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menuName, setMenuName] = useState('')
  const [menuPrice, setMenuPrice] = useState(5000)
  const [menuDuration, setMenuDuration] = useState(60)
  const [menuCategory, setMenuCategory] = useState('カット')
  const [menuDescription, setMenuDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([])
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  // Salons
  const [myHairdresserSalons, setMyHairdresserSalons] = useState<HairdresserSalon[]>([])
  const [allSalons, setAllSalons] = useState<(Salon & { profiles?: { name: string } })[]>([])
  const [salonFilter, setSalonFilter] = useState('')
  const [salonAreaFilter, setSalonAreaFilter] = useState('')
  const [addingSalon, setAddingSalon] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [
        { data: profile },
        { data: hd },
        { data: hsData },
        { data: salonsData },
      ] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('hairdressers').select('*').eq('id', user.id).single(),
        supabase.from('hairdresser_salons').select('*, salons(*, profiles(name))').eq('hairdresser_id', user.id).eq('status', 'active'),
        supabase.from('salons').select('*, profiles(name)'),
      ])

      if (profile) setName(profile.name || '')
      if (hd) {
        setBio(hd.bio || '')
        setInstagramUrl(hd.instagram_url || '')
        setArea(hd.area || '渋谷区')
        setMenus(hd.menus || [])
        setPortfolioUrls(hd.portfolio_urls || [])
      }
      setMyHairdresserSalons((hsData || []) as HairdresserSalon[])
      setAllSalons((salonsData || []) as (Salon & { profiles?: { name: string } })[])
      setLoading(false)
    }
    load()
  }, [])

  const addMenu = () => {
    if (!menuName.trim()) return
    setMenus(prev => [...prev, { name: menuName.trim(), price: menuPrice, duration: menuDuration, category: menuCategory, description: menuDescription.trim() || undefined }])
    setMenuName('')
    setMenuPrice(5000)
    setMenuDuration(60)
    setMenuDescription('')
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

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('JPGまたはPNG形式の画像のみアップロードできます')
      return
    }
    if (portfolioUrls.length >= 10) {
      alert('ポートフォリオは最大10枚までです')
      return
    }

    setUploadingPortfolio(true)
    const path = `${userId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('portfolio').upload(path, file)
    if (error) { alert('アップロードに失敗しました'); setUploadingPortfolio(false); return }

    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
      const newUrls = [...portfolioUrls, publicUrl]
      await supabase.from('hairdressers').update({ portfolio_urls: newUrls }).eq('id', userId)
      setPortfolioUrls(newUrls)
    }
    setUploadingPortfolio(false)
    if (portfolioInputRef.current) portfolioInputRef.current.value = ''
  }

  const handlePortfolioDelete = async (url: string) => {
    if (!userId) return
    const newUrls = portfolioUrls.filter(u => u !== url)
    await supabase.from('hairdressers').update({ portfolio_urls: newUrls }).eq('id', userId)
    setPortfolioUrls(newUrls)
    // Storageからも削除（URLからパスを抽出）
    const path = url.split('/portfolio/')[1]
    if (path) await supabase.storage.from('portfolio').remove([path])
  }

  const handleAddSalon = async (salonId: string) => {
    if (!userId) return
    setAddingSalon(true)
    const { data } = await supabase.from('hairdresser_salons').upsert(
      { hairdresser_id: userId, salon_id: salonId, status: 'active' },
      { onConflict: 'hairdresser_id,salon_id' }
    ).select('*, salons(*, profiles(name))').single()
    if (data) setMyHairdresserSalons(prev => [...prev.filter(hs => hs.salon_id !== salonId), data as HairdresserSalon])
    setAddingSalon(false)
  }

  const handleRemoveSalon = async (hairdresserSalonId: string) => {
    await supabase.from('hairdresser_salons').update({ status: 'inactive' }).eq('id', hairdresserSalonId)
    setMyHairdresserSalons(prev => prev.filter(hs => hs.id !== hairdresserSalonId))
  }

  const registeredSalonIds = new Set(myHairdresserSalons.map(hs => hs.salon_id))
  const filteredSalons = allSalons.filter(s => {
    if (registeredSalonIds.has(s.id)) return false
    if (salonAreaFilter && s.area !== salonAreaFilter) return false
    if (salonFilter && !(s.profiles?.name || '').includes(salonFilter)) return false
    return true
  })

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
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>EDIT PROFILE</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>プロフィール編集</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          {/* Basic info */}
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>BASIC INFO</p>
            <div className="space-y-8">
              <div>
                <label style={labelStyle}>NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="山田 花子" style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
              <div>
                <label style={labelStyle}>BIO</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="経歴・得意スタイル・こだわりなど"
                  style={{ ...underlineInput, resize: 'none' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
              <div>
                <label style={labelStyle}>AREA</label>
                <select value={area} onChange={e => setArea(e.target.value)} style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>INSTAGRAM URL</label>
                <input type="url" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..."
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
            </div>
          </div>

          {/* Menus */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>MENU & PRICE</p>

            {menus.length > 0 && (
              <div style={{ marginBottom: '1rem', border: '1px solid #ebebeb' }}>
                {menus.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < menus.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 300, flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {m.category && (
                          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: '#999999', background: '#f5f5f5', padding: '0.1rem 0.4rem', flexShrink: 0 }}>{m.category}</span>
                        )}
                        <span style={{ color: '#111111' }}>{m.name}</span>
                        <span style={{ color: '#999999', flexShrink: 0 }}>¥{m.price.toLocaleString()}</span>
                        <span style={{ fontSize: '0.7rem', color: '#cccccc', flexShrink: 0 }}>{m.duration ?? 60}分</span>
                      </div>
                      {m.description && (
                        <p style={{ fontSize: '0.7rem', color: '#aaaaaa', marginTop: '0.125rem', fontWeight: 300 }}>{m.description}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => setMenus(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ color: '#cccccc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新規メニュー追加フォーム */}
            <div style={{ border: '1px solid #ebebeb', padding: '1rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>+ メニューを追加</p>
              <div className="flex gap-3" style={{ marginBottom: '0.75rem' }}>
                <select value={menuCategory} onChange={e => setMenuCategory(e.target.value)}
                  style={{ ...underlineInput, width: '10rem', fontSize: '0.75rem' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')}>
                  {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="メニュー名（例: カット）"
                  style={{ ...underlineInput, flex: 1, width: 'auto' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
              <div className="flex gap-3" style={{ marginBottom: '0.75rem' }}>
                <input type="text" value={menuDescription} onChange={e => setMenuDescription(e.target.value)} placeholder="説明（任意）"
                  style={{ ...underlineInput, flex: 1 }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
              <div className="flex gap-3">
                <input type="number" value={menuPrice} onChange={e => setMenuPrice(Number(e.target.value))} min={0} step={500} placeholder="金額"
                  style={{ ...underlineInput, width: '6rem' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
                <input type="number" value={menuDuration} onChange={e => setMenuDuration(Number(e.target.value))} min={5} step={5} placeholder="分"
                  style={{ ...underlineInput, width: '4.5rem' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
                <span style={{ fontSize: '0.75rem', color: '#cccccc', alignSelf: 'flex-end', paddingBottom: '0.5rem', flexShrink: 0 }}>分</span>
                <button type="button" onClick={addMenu}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #111111', color: '#111111', background: 'transparent', cursor: 'pointer', fontWeight: 300, display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                  <Plus size={12} /> 追加
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>PORTFOLIO</p>
            <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginBottom: '1rem' }}>
              施術写真を登録できます（最大10枚、JPG/PNGのみ）
            </p>

            {portfolioUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {portfolioUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', background: '#f5f5f5' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handlePortfolioDelete(url)}
                      style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', width: '1.25rem', height: '1.25rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {portfolioUrls.length < 10 && (
              <>
                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePortfolioUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={uploadingPortfolio}
                  style={{ width: '100%', padding: '1.25rem', border: '1px dashed #ebebeb', background: 'transparent', cursor: uploadingPortfolio ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#cccccc', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', opacity: uploadingPortfolio ? 0.5 : 1 }}
                >
                  {uploadingPortfolio ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingPortfolio ? 'アップロード中...' : '写真を追加'}
                </button>
              </>
            )}
          </div>

          {/* Salons */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>SALONS</p>

            {myHairdresserSalons.length > 0 && (
              <div style={{ marginBottom: '1.5rem', border: '1px solid #ebebeb' }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', padding: '0.75rem 1rem', borderBottom: '1px solid #ebebeb', fontWeight: 300 }}>
                  登録済みサロン ({myHairdresserSalons.length}件)
                </p>
                {myHairdresserSalons.map((hs, i) => (
                  <div key={hs.id} className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < myHairdresserSalons.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                        {(hs.salons as unknown as { profiles?: { name: string } })?.profiles?.name || 'サロン'}
                      </span>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#999999' }}>
                        {(hs.salons as unknown as { area?: string })?.area}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleRemoveSalon(hs.id)}
                      style={{ color: '#cccccc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add salon */}
            <div style={{ border: '1px solid #ebebeb', padding: '1rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>+ サロンを追加</p>
              <div className="flex gap-2 mb-3">
                <select value={salonAreaFilter} onChange={e => setSalonAreaFilter(e.target.value)}
                  style={{ ...underlineInput, width: '8rem', fontSize: '0.75rem' }}>
                  <option value="">エリア（全て）</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input type="text" value={salonFilter} onChange={e => setSalonFilter(e.target.value)} placeholder="サロン名で検索"
                  style={{ ...underlineInput, flex: 1, fontSize: '0.75rem' }} />
              </div>
              {filteredSalons.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#cccccc', textAlign: 'center', padding: '1rem 0', fontWeight: 300 }}>
                  {registeredSalonIds.size === allSalons.length ? '全サロン登録済み' : '該当するサロンがありません'}
                </p>
              ) : (
                <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
                  {filteredSalons.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-1"
                      style={{ borderBottom: i < filteredSalons.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                          {s.profiles?.name || 'サロン'}
                        </span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#999999' }}>{s.area}</span>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#cccccc' }}>¥{s.price_per_hour.toLocaleString()}/h</span>
                      </div>
                      <button type="button" onClick={() => handleAddSalon(s.id)} disabled={addingSalon}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.1em', border: '1px solid #111111', color: '#111111', background: 'transparent', cursor: 'pointer', fontWeight: 300, flexShrink: 0 }}>
                        追加
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4" style={{ borderTop: '1px solid #ebebeb', paddingTop: '2rem' }}>
            <button type="button" onClick={() => router.push('/dashboard')}
              style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
              キャンセル
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#ffffff', background: '#111111', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: saving ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saved ? '保存しました' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
