/**
 * Update avatar_url for demo hairdressers
 * Run: npx tsx scripts/update_avatars.ts
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

// randomuser.me portraits — picked for professional/stylish look
const AVATARS: Record<string, string> = {
  'tanaka@chairly.demo':  'https://randomuser.me/api/portraits/women/44.jpg', // 田中 美咲 (女性)
  'suzuki@chairly.demo':  'https://randomuser.me/api/portraits/men/32.jpg',   // 鈴木 健太 (男性)
  'yamada@chairly.demo':  'https://randomuser.me/api/portraits/women/67.jpg', // 山田 花子 (女性)
  'sato@chairly.demo':    'https://randomuser.me/api/portraits/women/56.jpg', // 佐藤 あおい (女性)
  'ito@chairly.demo':     'https://randomuser.me/api/portraits/men/47.jpg',   // 伊藤 大輔 (男性)
}

async function main() {
  console.log('🖼️  Updating avatar URLs...\n')

  const { data: users } = await supabase.auth.admin.listUsers()

  for (const [email, avatarUrl] of Object.entries(AVATARS)) {
    const user = users?.users.find(u => u.email === email)
    if (!user) { console.log(`  ⚠️  ${email} not found`); continue }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (error) {
      console.error(`  ❌ ${email}:`, error.message)
    } else {
      console.log(`  ✓ ${email} → ${avatarUrl}`)
    }
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
