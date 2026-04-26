/**
 * 加納竜也 登録スクリプト
 * Run: npx tsx scripts/seed_kanou.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const [key, ...values] = line.split('=')
  if (key && values.length) env[key.trim()] = values.join('=').trim()
}

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'], {
  auth: { autoRefreshToken: false, persistSession: false },
})

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function fmt(date: Date): string {
  return date.toISOString().split('T')[0]
}

const MENUS = [
  // 組み合わせメニュー
  { category: '組み合わせメニュー', name: 'ケラチンケアトリートメント', price: 3300, duration: 10, description: 'シャンプー台で行うシステムトリートメント。ケラチン補修成分と保護成分で髪のコンディションを整えます。オプション追加のみ。' },
  { category: '組み合わせメニュー', name: 'インナーケラチンリペアトリートメント', price: 5500, duration: 45, description: '年齢やカラーで変化した髪に、ケラチン補修成分を時間をかけて浸透させる集中ケア。' },
  { category: '組み合わせメニュー', name: 'プレミアムケラチントリートメント', price: 11000, duration: 60, description: '髪の状態に合わせてカスタマイズ。単品または他メニューとの組み合わせ使用。' },
  { category: '組み合わせメニュー', name: 'カット＋ヘッドスパ', price: 10450, duration: 100, description: '酵素パウダーで頭皮の汚れをすっきり落とし、マッサージで血行を促進するスパセット。' },
  // カット
  { category: 'カット', name: '前髪カット', price: 2200, duration: 10, description: '前髪のみのカット。' },
  { category: 'カット', name: 'カット(初回指名専用)', price: 7700, duration: 75, description: '加納担当が初めてで、カットのみご希望の方向けのメニューです。シャンプー・ブロー込み。' },
  { category: 'カット', name: 'カット（顧客様専用）', price: 7150, duration: 60, description: '2回目以降のリピーター様専用。シャンプー・ブロー込み。' },
  { category: 'カット', name: 'カット', price: 7150, duration: 60, description: 'シャンプー・ブロー込み。' },
  { category: 'カット', name: '眉カット', price: 1100, duration: 10, description: 'プロによる眉メンテナンス。男性・女性どなたでも。' },
  { category: 'カット', name: 'キッズカット', price: 4400, duration: 60, description: '中学生以下限定。シャンプー・ブロー込み。' },
  // カラー
  { category: 'カラー', name: 'カラーのみ', price: 8800, duration: 90, description: 'シャンプーブロー付き。髪質改善カラーは+¥1,650。白髪染め・男性も対応可。' },
  { category: 'カラー', name: 'カット＋カラー', price: 14850, duration: 130, description: 'トレンドに合わせた旬なカラー。白髪染め・男性も対応可。' },
  { category: 'カラー', name: 'カット＋ケアカラー', price: 16500, duration: 130, description: 'カラー中に保護成分とケラチン補修成分を使用。ダメージを抑えながら染めます。' },
  { category: 'カラー', name: 'カット＋イルミナカラー', price: 17050, duration: 130, description: '繰り返すほど透明感が増すカラー。赤み・黄色みが出にくく、柔らかな仕上がりに。' },
  { category: 'カラー', name: 'カット＋インナーカラー＋全体カラー', price: 19000, duration: 210, description: 'ケアブリーチ使用でダメージを94%軽減。インナーと全体のダブルカラー。' },
  { category: 'カラー', name: 'カット+ケアカラー+5stepクイックトリートメント', price: 22550, duration: 150, description: 'カラー中に超音波でケラチンを深浸透。最高品質の5種トリートメントで仕上げます。' },
  { category: 'カラー', name: 'カット＋ナチュラルハイライトカラー', price: 24750, duration: 210, description: 'セクションカラー。ケアブリーチ（ダメージ94%軽減）でナチュラルな立体感を演出。' },
  { category: 'カラー', name: 'カット＋ブリーチカラー＋全体カラー', price: 25300, duration: 270, description: 'ブリーチ後に全体カラーを重ねる透明感カラー。' },
  { category: 'カラー', name: 'カット＋ブリーチなしダブルカラー', price: 22550, duration: 180, description: 'ブリーチを使わず透明感を実現するダブルカラー。' },
  { category: 'カラー', name: 'インナーカラーのみ', price: 11000, duration: 150, description: 'ケアブリーチ付き。ダメージを94%軽減。' },
  { category: 'カラー', name: 'ブリーチカラー＋全体カラー', price: 18150, duration: 210, description: 'ブリーチ後全体カラー。ケアブリーチへのアップグレードは+¥2,200。' },
  { category: 'カラー', name: 'ウィービングカラー全頭', price: 9900, duration: 120, description: '細かくすくい部分的に染め、自然な立体感を演出。ダメージが少ないのも特徴。' },
  { category: 'カラー', name: 'ウィービング根本リタッチ', price: 8800, duration: 90, description: '根元のみの部分染め。頭皮にやさしく、ダメージを最小限に抑えます。' },
  // パーマ
  { category: 'パーマ', name: '前髪パーマ', price: 3300, duration: 30, description: '前髪が流れにくい方向けのパーマ。オプション追加のみ。' },
  { category: 'パーマ', name: 'カット＋パーマ', price: 14850, duration: 130, description: '髪質診断を行い、傷みを最小限に抑えたパーマ施術。' },
  // 縮毛矯正
  { category: '縮毛矯正', name: 'カット＋縮毛矯正', price: 27500, duration: 250, description: '髪の状態に合わせて薬剤を調合し、自然なストレートに仕上げます。' },
  { category: '縮毛矯正', name: 'カット＋縮毛矯正＋特殊トリートメント', price: 31900, duration: 250, description: '矯正中に栄養素を深浸透。最高品質の3種トリートメントを使用した贅沢なケア。' },
  { category: '縮毛矯正', name: '前髪ストレート', price: 6600, duration: 90, description: '前髪のみの縮毛矯正。' },
  { category: '縮毛矯正', name: 'お顔周りの縮毛矯正', price: 9900, duration: 90, description: '前髪〜サイドバングのくせ毛を自然な丸みを残しながらナチュラルにストレートへ。' },
  { category: '縮毛矯正', name: '縮毛矯正', price: 17600, duration: 180, description: '髪の状態に合わせた薬剤調合で、自然なストレートを実現。' },
  // その他
  { category: 'その他', name: '追加シャンプーブロー', price: 2200, duration: 30, description: 'カット非実施時に追加することを推奨します。' },
]

async function main() {
  console.log('🌱 加納竜也 登録開始...\n')

  // --- 1. Auth ユーザー作成 ---
  console.log('👤 Auth ユーザー作成...')
  const email = 'kanou@chairly.demo'
  const password = 'chairly2025!'

  // 既存確認
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find(u => u.email === email)

  let userId: string
  if (existing) {
    userId = existing.id
    console.log(`  ✓ 既存ユーザー: ${userId}`)
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !newUser.user) { console.error('  ❌', error?.message); process.exit(1) }
    userId = newUser.user.id
    console.log(`  ✓ 新規作成: ${userId}`)
  }

  // --- 2. 写真アップロード ---
  console.log('\n📸 写真アップロード...')
  // バケット確認・作成
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === 'avatars')) {
    const { error: bucketError } = await supabase.storage.createBucket('avatars', { public: true })
    if (bucketError) { console.error('  ❌ bucket:', bucketError.message); process.exit(1) }
    console.log('  ✓ バケット作成: avatars')
  }
  const photoPath = '/Users/keisuke/Downloads/kanou.jpg'
  const photoBuffer = fs.readFileSync(photoPath)

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload('kanou.jpg', photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) { console.error('  ❌', uploadError.message); process.exit(1) }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl('kanou.jpg')
  const avatarUrl = urlData.publicUrl
  console.log(`  ✓ ${avatarUrl}`)

  // --- 3. profiles 登録 ---
  console.log('\n💾 profiles 登録...')
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'hairdresser',
    name: '加納竜也',
    avatar_url: avatarUrl,
  })
  if (profileError) { console.error('  ❌', profileError.message); process.exit(1) }
  console.log('  ✓ profiles OK')

  // --- 4. hairdressers 登録 ---
  console.log('\n💇 hairdressers 登録...')
  const { error: hdError } = await supabase.from('hairdressers').upsert({
    id: userId,
    bio: 'カット・カラー・縮毛矯正を得意とするスタイリスト。ケラチントリートメントやハイライトカラーも人気。丁寧なカウンセリングで一人ひとりに合ったスタイルを提案します。',
    area: '渋谷区',
    menus: MENUS,
    portfolio_urls: [],
  })
  if (hdError) { console.error('  ❌', hdError.message); process.exit(1) }
  console.log(`  ✓ hairdressers OK (メニュー${MENUS.length}件)`)

  // --- 5. 全サロンに接続 ---
  console.log('\n🔗 サロン接続...')
  const { data: salons } = await supabase.from('salons').select('id')
  if (!salons?.length) { console.warn('  ⚠️  サロンが見つかりません'); }
  else {
    for (const salon of salons) {
      const { error } = await supabase.from('hairdresser_salons').upsert({
        hairdresser_id: userId,
        salon_id: salon.id,
        status: 'active',
      }, { onConflict: 'hairdresser_id,salon_id' })
      if (error) console.error(`  ❌ salon ${salon.id}:`, error.message)
      else console.log(`  ✓ salon ${salon.id}`)
    }
  }

  // --- 6. 空き枠作成（21日分、火曜定休、10:00-19:00）---
  console.log('\n📅 空き枠作成...')
  const today = new Date()
  const availRows = []
  for (let day = 1; day <= 21; day++) {
    const d = addDays(today, day)
    if (d.getDay() === 2) continue // 火曜定休
    availRows.push({
      hairdresser_id: userId,
      date: fmt(d),
      start_time: '10:00:00',
      end_time: '19:00:00',
    })
  }
  const { error: availError } = await supabase.from('hairdresser_availability').insert(availRows)
  if (availError) console.error('  ❌', availError.message)
  else console.log(`  ✓ ${availRows.length}日分`)

  console.log('\n✅ 完了!')
  console.log('  メール:    kanou@chairly.demo')
  console.log('  パスワード: chairly2025!')
}

main().catch(console.error)
