import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StampCardSection from './StampCardSection'
import WithdrawSection from './WithdrawSection'

interface Coupon {
  id: string
  discount_type: 'amount' | 'rate'
  discount_value: number
  expires_at: string
  used_at: string | null
  created_at: string
  reward_description?: string | null
  funding_type?: string | null
}

interface GuestStampWithCard {
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

function formatDiscount(c: Coupon) {
  if (c.reward_description) return c.reward_description
  return c.discount_type === 'amount'
    ? `¥${c.discount_value.toLocaleString()}割引`
    : `${c.discount_value}%割引`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

const labelStyle = { fontSize: '0.6rem', letterSpacing: '0.25em', color: '#cccccc', fontWeight: 300, marginBottom: '1rem', display: 'block' } as const

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const [{ data: allCoupons }, { data: stampData }] = await Promise.all([
    supabase
      .from('coupons')
      .select('id, discount_type, discount_value, expires_at, used_at, created_at, reward_description, funding_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('guest_stamps')
      .select('id, hairdresser_id, stamp_count, total_stamps, stamp_cards(stamps_required, reward_description, card_design, is_active), hairdressers!guest_stamps_hairdresser_id_fkey(profiles(name))')
      .eq('guest_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  const coupons = (allCoupons as Coupon[]) || []
  const stamps = (stampData as unknown as GuestStampWithCard[]) || []
  const activeStamps = stamps.filter(s => s.stamp_cards?.is_active)

  const valid = coupons.filter(c => !c.used_at && c.expires_at > now)
  const used = coupons.filter(c => !!c.used_at)
  const expired = coupons.filter(c => !c.used_at && c.expires_at <= now)

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-2xl mx-auto">
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>MY PAGE</p>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 100, marginBottom: '3rem' }}>マイページ</h1>

        {/* スタンプカード */}
        {activeStamps.length > 0 && (
          <section className="mb-12">
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111111', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>スタンプカード</p>
            <StampCardSection stamps={activeStamps} />
          </section>
        )}

        {/* クーポン */}
        <section className="mb-12">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111111', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>保有クーポン</p>

          <div className="mb-8">
            <span style={labelStyle}>VALID</span>
            {valid.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#cccccc', paddingLeft: '0.5rem' }}>有効なクーポンはありません</p>
            ) : (
              <div style={{ border: '1px solid #ebebeb' }}>
                {valid.map((c, i) => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: i < valid.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: 600, color: '#111111', marginBottom: '0.25rem' }}>
                        {formatDiscount(c)}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#999999' }}>
                        有効期限: {formatDate(c.expires_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#4a7c59', fontWeight: 500 }}>VALID</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {used.length > 0 && (
            <div className="mb-8">
              <span style={labelStyle}>USED</span>
              <div style={{ border: '1px solid #ebebeb', opacity: 0.5 }}>
                {used.map((c, i) => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: i < used.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '0.95rem', color: '#999999', marginBottom: '0.25rem' }}>{formatDiscount(c)}</p>
                      <p style={{ fontSize: '0.7rem', color: '#cccccc' }}>使用日: {formatDate(c.used_at!)}</p>
                    </div>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999' }}>USED</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expired.length > 0 && (
            <div>
              <span style={labelStyle}>EXPIRED</span>
              <div style={{ border: '1px solid #ebebeb', opacity: 0.4 }}>
                {expired.map((c, i) => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: i < expired.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '0.95rem', color: '#999999', marginBottom: '0.25rem' }}>{formatDiscount(c)}</p>
                      <p style={{ fontSize: '0.7rem', color: '#cccccc' }}>期限: {formatDate(c.expires_at)}</p>
                    </div>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#cccccc' }}>EXPIRED</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coupons.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#cccccc' }}>クーポンはありません。初回ご利用後に発行されます。</p>
          )}
        </section>

        <WithdrawSection />
      </div>
    </div>
  )
}
