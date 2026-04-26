/**
 * Seed script for Chairly prototype
 * Run: npx tsx scripts/seed.ts
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 2. Run the schema migrations first
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const [key, ...values] = line.split('=')
  if (key && values.length) env[key.trim()] = values.join('=').trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_url') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'your_service_role_key') {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DUMMY_PASSWORD = 'chairly2025!'

const HAIRDRESSERS = [
  {
    email: 'tanaka@chairly.demo',
    name: '田中 美咲',
    bio: '表参道の有名サロンで10年のキャリア。ハイライト・カラーが得意。自然なツヤ感を大切にしています。',
    area: '渋谷区',
    instagram_url: 'https://instagram.com/',
    menus: [
      { name: 'カット', price: 6000 },
      { name: 'カラー', price: 10000 },
      { name: 'ハイライト', price: 15000 },
      { name: 'カット＋カラー', price: 14000 },
    ],
  },
  {
    email: 'suzuki@chairly.demo',
    name: '鈴木 健太',
    bio: 'メンズ専門スタイリスト。刈り上げ・フェードカットが得意。清潔感のあるスタイルを提案します。',
    area: '新宿区',
    instagram_url: 'https://instagram.com/',
    menus: [
      { name: 'メンズカット', price: 5000 },
      { name: 'パーマ', price: 12000 },
      { name: 'スタイリング', price: 3000 },
    ],
  },
  {
    email: 'yamada@chairly.demo',
    name: '山田 花子',
    bio: '縮毛矯正・トリートメントのスペシャリスト。くせ毛でお悩みの方をサポートします。',
    area: '港区',
    instagram_url: 'https://instagram.com/',
    menus: [
      { name: 'トリートメント', price: 8000 },
      { name: '縮毛矯正', price: 20000 },
      { name: 'カット＋トリートメント', price: 12000 },
    ],
  },
  {
    email: 'sato@chairly.demo',
    name: '佐藤 あおい',
    bio: 'ウェディング・特別な日のヘアアレンジが得意。セットアップからアップスタイルまで対応。',
    area: '世田谷区',
    instagram_url: 'https://instagram.com/',
    menus: [
      { name: 'ヘアセット', price: 7000 },
      { name: 'アップスタイル', price: 9000 },
      { name: 'カット', price: 5500 },
    ],
  },
  {
    email: 'ito@chairly.demo',
    name: '伊藤 大輔',
    bio: '外国人風カラーと波巻きパーマが専門。トレンドに敏感で、旬のスタイルを提案。',
    area: '豊島区',
    instagram_url: 'https://instagram.com/',
    menus: [
      { name: 'カット', price: 6500 },
      { name: 'ブリーチ', price: 13000 },
      { name: 'パーマ', price: 11000 },
      { name: 'カット＋ブリーチ', price: 18000 },
    ],
  },
]

const SALONS = [
  {
    email: 'salon_shibuya@chairly.demo',
    name: 'Space Shibuya',
    address: '東京都渋谷区円山町 3-5',
    area: '渋谷区',
    description: '渋谷駅徒歩5分。全4セット。シャンプー台完備。Wi-Fi・電子レンジあり。清潔感のある広々スペース。',
    price_per_hour: 2500,
    equipment: ['シャンプー台', 'カラーチェア', 'ドライヤー', 'セット面', 'Wi-Fi'],
  },
  {
    email: 'salon_omotesando@chairly.demo',
    name: 'Salon Omotesando',
    address: '東京都港区南青山 5-12-1',
    area: '港区',
    description: '表参道駅直結。デザイナーズビル内の洗練されたサロンスペース。ハイエンドな設備を完備。',
    price_per_hour: 4000,
    equipment: ['シャンプー台', 'カラーチェア', 'スチーマー', 'パーマ機器', 'ドライヤー', 'セット面'],
  },
  {
    email: 'salon_shinjuku@chairly.demo',
    name: 'Studio Shinjuku',
    address: '東京都新宿区新宿 3-2-8',
    area: '新宿区',
    description: '新宿駅南口から徒歩3分。6セット完備の大型スペース。時間貸し・日貸しどちらも対応。',
    price_per_hour: 2000,
    equipment: ['シャンプー台', 'ドライヤー', 'セット面', 'ウォッシュボウル'],
  },
]

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function createUser(email: string, name: string, role: 'hairdresser' | 'salon' | 'consumer') {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DUMMY_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users.users.find(u => u.email === email)
      if (user) return user
    }
    console.error(`Error creating user ${email}:`, error)
    return null
  }

  return data.user
}

async function main() {
  console.log('🌱 Starting seed...\n')

  const hairdresserIds: string[] = []
  const salonIds: string[] = []
  const today = new Date()

  // Create hairdressers
  console.log('👤 Creating hairdressers...')
  for (const hd of HAIRDRESSERS) {
    const user = await createUser(hd.email, hd.name, 'hairdresser')
    if (!user) continue

    await supabase.from('profiles').upsert({
      id: user.id,
      role: 'hairdresser',
      name: hd.name,
    })

    await supabase.from('hairdressers').upsert({
      id: user.id,
      bio: hd.bio,
      instagram_url: hd.instagram_url,
      area: hd.area,
      menus: hd.menus,
    })

    hairdresserIds.push(user.id)
    console.log(`  ✓ ${hd.name} (${hd.area})`)
  }

  // Create salons
  console.log('\n🏢 Creating salons...')
  for (const salon of SALONS) {
    const user = await createUser(salon.email, salon.name, 'salon')
    if (!user) continue

    await supabase.from('profiles').upsert({
      id: user.id,
      role: 'salon',
      name: salon.name,
    })

    await supabase.from('salons').upsert({
      id: user.id,
      address: salon.address,
      area: salon.area,
      description: salon.description,
      price_per_hour: salon.price_per_hour,
      equipment: salon.equipment,
    })

    salonIds.push(user.id)
    console.log(`  ✓ ${salon.name} (${salon.area})`)
  }

  // Create consumer
  console.log('\n🙋 Creating demo consumer...')
  const consumer = await createUser('consumer@chairly.demo', 'デモユーザー', 'consumer')
  if (consumer) {
    await supabase.from('profiles').upsert({
      id: consumer.id,
      role: 'consumer',
      name: 'デモユーザー',
    })
    console.log(`  ✓ デモユーザー`)
  }

  // Create slots (2 weeks from today)
  console.log('\n📅 Creating slots...')

  // Hairdresser slots
  for (let i = 0; i < hairdresserIds.length; i++) {
    const hdId = hairdresserIds[i]
    const slotData = []

    for (let day = 1; day <= 14; day++) {
      const date = formatDate(addDays(today, day))
      const dow = addDays(today, day).getDay()

      // Weekdays: 2-3 slots, Weekends: 1-2 slots
      const slotCount = dow === 0 || dow === 6 ? 2 : 3
      const startHours = [10, 13, 16]

      for (let s = 0; s < slotCount; s++) {
        const startH = startHours[s]
        slotData.push({
          hairdresser_id: hdId,
          date,
          start_time: `${String(startH).padStart(2, '0')}:00:00`,
          end_time: `${String(startH + 2).padStart(2, '0')}:00:00`,
          status: 'available',
        })
      }
    }

    const { error } = await supabase.from('slots').insert(slotData)
    if (error) console.error('Slot insert error:', error)
  }
  console.log(`  ✓ ${hairdresserIds.length} hairdressers × 2 weeks`)

  // Salon slots
  for (let i = 0; i < salonIds.length; i++) {
    const salonId = salonIds[i]
    const slotData = []

    for (let day = 0; day <= 14; day++) {
      const date = formatDate(addDays(today, day))
      // Salons have hourly slots from 9:00 to 20:00
      for (let h = 9; h <= 19; h++) {
        slotData.push({
          salon_id: salonId,
          date,
          start_time: `${String(h).padStart(2, '0')}:00:00`,
          end_time: `${String(h + 1).padStart(2, '0')}:00:00`,
          status: 'available',
        })
      }
    }

    const { error } = await supabase.from('slots').insert(slotData)
    if (error) console.error('Salon slot insert error:', error)
  }
  console.log(`  ✓ ${salonIds.length} salons × 2 weeks`)

  console.log('\n✅ Seed complete!')
  console.log('\n📧 Demo accounts:')
  console.log('  Consumer:   consumer@chairly.demo  / chairly2025!')
  console.log('  Hairdresser: tanaka@chairly.demo   / chairly2025!')
  console.log('  Salon:       salon_shibuya@chairly.demo / chairly2025!')
}

main().catch(console.error)
