import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [{ data: thisMonth }, { data: prevMonth }] = await Promise.all([
    supabase
      .from('bookings')
      .select('hairdresser_availability!inner(hairdresser_id)')
      .neq('status', 'cancelled')
      .gte('created_at', thisMonthStart)
      .lt('created_at', nextMonthStart),
    supabase
      .from('bookings')
      .select('hairdresser_availability!inner(hairdresser_id)')
      .neq('status', 'cancelled')
      .gte('created_at', prevMonthStart)
      .lt('created_at', thisMonthStart),
  ])

  // Aggregate counts by hairdresser_id (via hairdresser_availability join)
  // Supabase returns hairdresser_availability as array (one-to-many relation)
  const countMap = (rows: { hairdresser_availability: { hairdresser_id: string }[] }[] | null) => {
    const map: Record<string, number> = {}
    for (const row of rows ?? []) {
      const availability = Array.isArray(row.hairdresser_availability)
        ? row.hairdresser_availability[0]
        : row.hairdresser_availability
      const id = availability?.hairdresser_id
      if (id) map[id] = (map[id] ?? 0) + 1
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

  // Trending: this month >= 5 AND +50% vs prev month (requires prior month baseline)
  const trending = Object.entries(thisCounts)
    .filter(([id, count]) => {
      if (count < 5) return false
      const prev = prevCounts[id] ?? 0
      if (prev === 0) return false
      return count >= prev * 1.5
    })
    .map(([id]) => id)

  return NextResponse.json({ rankings, trending })
}
