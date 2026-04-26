/**
 * Upload avatar photos to Supabase Storage and update profiles
 * Run: npx tsx scripts/upload_avatars.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

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

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImage(res.headers.location!).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'avatars')
  if (!exists) {
    const { error } = await supabase.storage.createBucket('avatars', { public: true })
    if (error) throw error
    console.log('  ✓ Created bucket: avatars')
  } else {
    console.log('  ✓ Bucket exists: avatars')
  }
}

async function uploadAvatar(filename: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<string> {
  const { error } = await supabase.storage
    .from('avatars')
    .upload(filename, buffer, { contentType, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(filename)
  return data.publicUrl
}

async function main() {
  console.log('🖼️  Uploading avatars to Supabase Storage...\n')

  await ensureBucket()

  // 加納竜也の写真（ローカルファイル）
  const kanouPhotoPath = '/Users/keisuke/Downloads/kanou.jpg'
  const kanouBuffer = fs.readFileSync(kanouPhotoPath)

  // 田中美咲用：カリスマ女性美容師スタイル（Unsplash）
  // 鈴木健太：男性
  // 山田花子：女性
  // 佐藤あおい：女性
  // 伊藤大輔：男性
  const PHOTO_URLS: Record<string, string> = {
    'tanaka':  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop&crop=face',
    'suzuki':  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face',
    'yamada':  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop&crop=face',
    'sato':    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=500&fit=crop&crop=face',
    'ito':     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face',
  }

  const uploaded: Record<string, string> = {}

  // 加納さんのローカル画像
  console.log('\n📸 Uploading 加納竜也 photo...')
  const kanouUrl = await uploadAvatar('kanou.jpg', kanouBuffer)
  uploaded['kanou@chairly.demo'] = kanouUrl
  console.log(`  ✓ kanou.jpg → ${kanouUrl}`)

  // 他の美容師のUnsplash画像
  console.log('\n📸 Downloading & uploading hairdresser photos...')
  for (const [key, url] of Object.entries(PHOTO_URLS)) {
    try {
      const buf = await downloadImage(url)
      const publicUrl = await uploadAvatar(`${key}.jpg`, buf)
      uploaded[`${key}@chairly.demo`] = publicUrl
      console.log(`  ✓ ${key}.jpg → uploaded (${buf.length} bytes)`)
    } catch (e) {
      console.error(`  ❌ ${key}:`, e)
    }
  }

  // プロフィール更新
  console.log('\n💾 Updating profiles...')
  const { data: users } = await supabase.auth.admin.listUsers()
  for (const [email, avatarUrl] of Object.entries(uploaded)) {
    const user = users?.users.find(u => u.email === email)
    if (!user) { console.log(`  ⚠️  ${email} not found`); continue }
    const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
    if (error) console.error(`  ❌ ${email}:`, error.message)
    else console.log(`  ✓ ${email}`)
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
