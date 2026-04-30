import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [{ data: thisMonth }, { data: prevMonth }] = await Promise.all([
    supabase
      .from('bookings')
      .select('hairdresser_id')
      .neq('status', 'cancelled')
      .gte('created_at', thisMonthStart)
      .lt('created_at', nextMonthStart),
    supabase
      .from('bookings')
      .select('hairdresser_id')
      .neq('status', 'cancelled')
      .gte('created_at', prevMonthStart)
      .lt('created_at', thisMonthStart),
  ])

  // Aggregate counts by hairdresser_id
  const countMap = (rows: { hairdresser_id: string }[] | null) => {
    const map: Record<string, number> = {}
    for (const row of rows ?? []) {
      if (row.hairdresser_id) map[row.hairdresser_id] = (map[row.hairdresser_id] ?? 0) + 1
    }
    return map
  }

  const thisCounts = countMap(thisMonth)
  const prevCounts = countMap(prevMonth)

  // Top 3 by this month count
  const sorted = Object.entries(thisCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const rankings = sorted.map(([hairdresser_id, count], i) => ({
    hairdresser_id,
    rank: i + 1,
    count,
  }))

  // Trending: this month >= 5 AND +50% vs prev month
  const trending = Object.entries(thisCounts)
    .filter(([id, count]) => {
      if (count < 5) return false
      const prev = prevCounts[id] ?? 0
      if (prev === 0) return true
      return count >= prev * 1.5
    })
    .map(([id]) => id)

  return NextResponse.json({ rankings, trending })
}
