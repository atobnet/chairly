'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { BusinessHourEntry, BusinessHours } from '@/types'

const EQUIPMENT_OPTIONS = ['シャンプー台', 'カラーチェア', 'スチーマー', 'パーマ機器', 'ドライヤー', 'セット面', 'ウォッシュボウル', 'Wi-Fi', '駐車場']
const AREAS = ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '墨田区', '江東区', '葛飾区', '足立区', '杉並区', '中野区']

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = typeof DAY_KEYS[number]
const DAY_LABELS: Record<DayKey, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' }

const defaultHours = (): BusinessHours =>
  Object.fromEntries(DAY_KEYS.map(d => [d, { open: '10:00', close: '20:00', closed: false }])) as BusinessHours

export default function SpaceEditPage() {
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('渋谷区')
  const [description, setDescription] = useState('')
  const [pricePerHour, setPricePerHour] = useState(2000)
  const [equipment, setEquipment] = useState<string[]>([])
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultHours())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('salons').select('*').eq('id', user.id).single()
      if (data) {
        setAddress(data.address || '')
        setArea(data.area || '渋谷区')
        setDescription(data.description || '')
        setPricePerHour(data.price_per_hour || 2000)
        setEquipment(data.equipment || [])
        setGalleryImages(data.gallery_images || [])
        setBusinessHours(data.business_hours && Object.keys(data.business_hours).length > 0 ? data.business_hours : defaultHours())
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('salons').upsert({
      id: user.id, address, area, description, price_per_hour: pricePerHour,
      equipment, business_hours: businessHours,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('JPGまたはPNG形式のみアップロードできます')
      return
    }
    if (galleryImages.length >= 6) {
      alert('ギャラリーは最大6枚までです')
      return
    }
    setUploadingGallery(true)
    const path = `${userId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('salon-gallery').upload(path, file)
    if (error) { alert('アップロードに失敗しました'); setUploadingGallery(false); return }
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('salon-gallery').getPublicUrl(path)
      const newUrls = [...galleryImages, publicUrl]
      await supabase.from('salons').update({ gallery_images: newUrls }).eq('id', userId)
      setGalleryImages(newUrls)
    }
    setUploadingGallery(false)
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleGalleryDelete = async (url: string) => {
    if (!userId) return
    const newUrls = galleryImages.filter(u => u !== url)
    await supabase.from('salons').update({ gallery_images: newUrls }).eq('id', userId)
    setGalleryImages(newUrls)
    const path = url.split('/salon-gallery/')[1]
    if (path) await supabase.storage.from('salon-gallery').remove([path])
  }

  const updateHours = (day: DayKey, field: keyof BusinessHourEntry, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...(prev[day] || { open: '10:00', close: '20:00', closed: false }), [field]: value },
    }))
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
          {/* Location */}
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>LOCATION</p>
            <div className="space-y-8">
              <div>
                <label style={labelStyle}>ADDRESS</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} required placeholder="東京都渋谷区○○ 1-2-3"
                  style={underlineInput}
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
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="スペースの特徴、アクセス方法など"
                  style={{ ...underlineInput, resize: 'none' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
              <div>
                <label style={labelStyle}>PRICE PER HOUR (¥)</label>
                <input type="number" value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} min={0} step={100}
                  style={underlineInput}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>EQUIPMENT</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(item => (
                <button key={item} type="button"
                  onClick={() => setEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item])}
                  style={{
                    padding: '0.375rem 0.875rem', fontSize: '0.75rem', letterSpacing: '0.04em',
                    border: equipment.includes(item) ? '1px solid #111111' : '1px solid #ebebeb',
                    background: equipment.includes(item) ? '#111111' : 'transparent',
                    color: equipment.includes(item) ? '#ffffff' : '#999999',
                    cursor: 'pointer', fontWeight: 300, transition: 'all 0.15s',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>GALLERY</p>
            <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginBottom: '1rem' }}>
              内装・設備写真（最大6枚、JPG/PNGのみ）
            </p>

            {galleryImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {galleryImages.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', background: '#f5f5f5' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleGalleryDelete(url)}
                      style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', width: '1.25rem', height: '1.25rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {galleryImages.length < 6 && (
              <>
                <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png" onChange={handleGalleryUpload} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingGallery}
                  style={{ width: '100%', padding: '1.25rem', border: '1px dashed #ebebeb', background: 'transparent', cursor: uploadingGallery ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#cccccc', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.1em', opacity: uploadingGallery ? 0.5 : 1 }}
                >
                  {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingGallery ? 'アップロード中...' : `写真を追加 (${galleryImages.length}/6)`}
                </button>
              </>
            )}
          </div>

          {/* Business Hours */}
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>BUSINESS HOURS</p>
            <div style={{ border: '1px solid #ebebeb' }}>
              {DAY_KEYS.map((day, i) => {
                const entry: BusinessHourEntry = businessHours[day] || { open: '10:00', close: '20:00', closed: false }
                return (
                  <div key={day} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                    borderBottom: i < DAY_KEYS.length - 1 ? '1px solid #ebebeb' : 'none',
                    opacity: entry.closed ? 0.5 : 1,
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 300, width: '1.5rem', flexShrink: 0 }}>{DAY_LABELS[day]}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', color: '#999999', fontWeight: 300, flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={entry.closed}
                        onChange={e => updateHours(day, 'closed', e.target.checked)}
                        style={{ accentColor: '#111111' }}
                      />
                      定休日
                    </label>
                    {!entry.closed && (
                      <>
                        <input
                          type="time"
                          value={entry.open}
                          onChange={e => updateHours(day, 'open', e.target.value)}
                          style={{ fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none', background: 'transparent', color: '#111111', fontWeight: 300, padding: '0.25rem 0', width: '5rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#cccccc' }}>–</span>
                        <input
                          type="time"
                          value={entry.close}
                          onChange={e => updateHours(day, 'close', e.target.value)}
                          style={{ fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none', background: 'transparent', color: '#111111', fontWeight: 300, padding: '0.25rem 0', width: '5rem' }}
                        />
                      </>
                    )}
                  </div>
                )
              })}
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
