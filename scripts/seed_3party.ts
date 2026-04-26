/**
 * Seed script for 3-party matching data
 * Run: npx tsx scripts/seed_3party.ts
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

async function main() {
  console.log('🌱 Seeding 3-party matching data...\n')

  // --- 既存ユーザーID取得 ---
  const { data: hdProfiles } = await supabase
    .from('profiles').select('id, name').eq('role', 'hairdresser')

  const { data: hdRows } = await supabase
    .from('hairdressers').select('id, area')

  const { data: salonRows } = await supabase
    .from('salons').select('id, area')

  const { data: salonProfiles } = await supabase
    .from('profiles').select('id, name').eq('role', 'salon')

  if (!hdProfiles?.length || !salonRows?.length) {
    console.error('❌ No hairdressers/salons found. Run the base seed first.')
    process.exit(1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hdAreaMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const h of (hdRows as any[])) hdAreaMap[h.id] = h.area

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hds = (hdProfiles as any[]).map(p => ({ id: p.id, name: p.name, area: hdAreaMap[p.id] || '' }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salonNameMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (salonProfiles as any[])) salonNameMap[p.id] = p.name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slns = (salonRows as any[]).map(s => ({ id: s.id, area: s.area, name: salonNameMap[s.id] || 'サロン' }))

  console.log(`Found ${hds.length} hairdressers, ${slns.length} salons`)
  hds.forEach(h => console.log(`  💇 ${h.name} (${h.area})`))
  slns.forEach(s => console.log(`  🏢 ${s.name} (${s.area})`))

  // --- 1. 古いデータをクリア ---
  console.log('\n🗑️  Clearing existing 3-party data...')
  await supabase.from('hairdresser_availability').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('salon_availability').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('hairdresser_salons').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  ✓ Cleared')

  // --- 2. サロン座標を更新 ---
  console.log('\n📍 Updating salon coordinates...')
  const coordMap: Record<string, { lat: number; lng: number }> = {
    '渋谷区': { lat: 35.6580, lng: 139.7016 },
    '港区':   { lat: 35.6654, lng: 139.7314 },
    '新宿区': { lat: 35.6938, lng: 139.7034 },
  }
  for (const s of slns) {
    const coords = coordMap[s.area]
    if (coords) {
      // 少しランダムにオフセット
      const jitter = () => (Math.random() - 0.5) * 0.005
      await supabase.from('salons').update({
        lat: coords.lat + jitter(),
        lng: coords.lng + jitter(),
      }).eq('id', s.id)
      console.log(`  ✓ ${s.name}: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
    }
  }

  // --- 3. hairdresser_salons: 現実的な組み合わせ ---
  // 美容師ごとに1〜2サロンを登録（エリア近いサロン優先）
  console.log('\n🔗 Creating hairdresser-salon connections...')

  // 美容師とサロンの対応（インデックスベース）
  // hds[0]=田中(渋谷) → 渋谷 + 港区
  // hds[1]=鈴木(新宿) → 新宿 + 渋谷
  // hds[2]=山田(港区) → 港区
  // hds[3]=佐藤(世田谷) → 渋谷 + 港区
  // hds[4]=伊藤(豊島) → 新宿
  // サロンインデックス: 0=渋谷, 1=港区(表参道), 2=新宿

  const shibuyaIdx  = slns.findIndex(s => s.area === '渋谷区')
  const minatoIdx   = slns.findIndex(s => s.area === '港区')
  const shinjukuIdx = slns.findIndex(s => s.area === '新宿区')

  // エリアに応じたサロン割り当て
  const hdSalonPairs: { hdIdx: number; salonIdxList: number[] }[] = [
    { hdIdx: 0, salonIdxList: [shibuyaIdx, minatoIdx].filter(i => i >= 0) },   // 渋谷エリア
    { hdIdx: 1, salonIdxList: [shinjukuIdx, shibuyaIdx].filter(i => i >= 0) }, // 新宿エリア
    { hdIdx: 2, salonIdxList: [minatoIdx].filter(i => i >= 0) },                // 港区
    { hdIdx: 3, salonIdxList: [shibuyaIdx, minatoIdx].filter(i => i >= 0) },   // 世田谷→渋谷・港区
    { hdIdx: 4, salonIdxList: [shinjukuIdx].filter(i => i >= 0) },              // 豊島→新宿
  ]

  for (const { hdIdx, salonIdxList } of hdSalonPairs) {
    if (hdIdx >= hds.length) continue
    const hd = hds[hdIdx]
    for (const sIdx of salonIdxList) {
      if (sIdx < 0 || sIdx >= slns.length) continue
      const salon = slns[sIdx]
      const { error } = await supabase.from('hairdresser_salons').insert({
        hairdresser_id: hd.id,
        salon_id: salon.id,
        status: 'active',
      })
      if (!error) console.log(`  ✓ ${hd.name} → ${salon.name}`)
    }
  }

  // --- 4. hairdresser_availability: 美容師ごとに異なるスケジュール ---
  console.log('\n📅 Creating hairdresser availability...')

  const today = new Date()

  // 美容師ごとの定休日・時間設定
  const hdSchedules = [
    { restDays: [1], startH: 10, endH: 18 },   // 月曜休み
    { restDays: [2], startH: 11, endH: 19 },   // 火曜休み
    { restDays: [0], startH: 10, endH: 17 },   // 日曜休み
    { restDays: [0, 1], startH: 9, endH: 16 }, // 日月休み
    { restDays: [3], startH: 12, endH: 20 },   // 水曜休み
  ]

  for (let i = 0; i < hds.length; i++) {
    const hd = hds[i]
    const sch = hdSchedules[i % hdSchedules.length]
    const rows = []

    for (let day = 1; day <= 21; day++) {
      const d = addDays(today, day)
      const dow = d.getDay()
      if (sch.restDays.includes(dow)) continue

      rows.push({
        hairdresser_id: hd.id,
        date: fmt(d),
        start_time: `${String(sch.startH).padStart(2, '0')}:00:00`,
        end_time: `${String(sch.endH).padStart(2, '0')}:00:00`,
      })
    }

    const { error } = await supabase.from('hairdresser_availability').insert(rows)
    if (error) { console.error(`  ❌ ${hd.name}:`, error.message); continue }
    console.log(`  ✓ ${hd.name}: ${rows.length}日分 (${sch.startH}:00-${sch.endH}:00, 定休日: ${sch.restDays.map(d => ['日','月','火','水','木','金','土'][d]).join('・')})`)
  }

  // --- 5. salon_availability: サロンごとに異なる営業時間 ---
  console.log('\n🏢 Creating salon availability...')

  const salonSchedules = [
    { restDays: [0], startH: 9, endH: 20 },   // 日曜休み
    { restDays: [], startH: 10, endH: 21 },    // 無休
    { restDays: [0, 1], startH: 9, endH: 19 }, // 日月休み
  ]

  for (let i = 0; i < slns.length; i++) {
    const salon = slns[i]
    const sch = salonSchedules[i % salonSchedules.length]
    const rows = []

    for (let day = 0; day <= 21; day++) {
      const d = addDays(today, day)
      const dow = d.getDay()
      if (sch.restDays.includes(dow)) continue

      rows.push({
        salon_id: salon.id,
        date: fmt(d),
        start_time: `${String(sch.startH).padStart(2, '0')}:00:00`,
        end_time: `${String(sch.endH).padStart(2, '0')}:00:00`,
      })
    }

    const { error } = await supabase.from('salon_availability').insert(rows)
    if (error) { console.error(`  ❌ ${salon.name}:`, error.message); continue }
    console.log(`  ✓ ${salon.name}: ${rows.length}日分 (${sch.startH}:00-${sch.endH}:00)`)
  }

  // --- 6. 結果確認 ---
  console.log('\n📊 Checking available_slots view...')
  const { data: viewCount } = await supabase.from('available_slots').select('*', { count: 'exact', head: true })
  console.log(`  ✓ available_slots: ${(viewCount as unknown as { count: number } | null)?.count ?? '?'} 件`)

  const { count } = await supabase.from('available_slots').select('*', { count: 'exact', head: true })
  console.log(`  ✓ 予約可能枠: ${count} 件\n`)

  console.log('✅ Done!\n')
  console.log('📧 Demo accounts (password: chairly2025!)')
  console.log('  消費者:    consumer@chairly.demo')
  console.log('  美容師:    tanaka@chairly.demo  (渋谷・表参道)')
  console.log('             suzuki@chairly.demo  (新宿・渋谷)')
  console.log('             yamada@chairly.demo  (表参道)')
  console.log('             sato@chairly.demo    (渋谷・表参道)')
  console.log('             ito@chairly.demo     (新宿)')
  console.log('  サロン:    salon_shibuya@chairly.demo')
  console.log('             salon_omotesando@chairly.demo')
  console.log('             salon_shinjuku@chairly.demo')
}

main().catch(console.error)
