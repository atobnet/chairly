/**
 * キャンセルポリシー: 消費者キャンセルの返金率（JST カレンダー日付で比較）
 *
 * @param bookedDate - 予約日 (YYYY-MM-DD)
 * @param now        - テスト時に注入する現在時刻（省略時は new Date()）
 * @returns 返金率 (0.0〜1.0)
 */
export function calcRefundRate(bookedDate: string, now?: Date): number {
  const base = now ?? new Date()

  // 現在のJST日付（時刻を切り捨て）
  const nowJST = new Date(base.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const nowDay = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate())

  // 予約日（YYYY-MM-DD → JST当日0時）
  const [y, m, d] = bookedDate.split('-').map(Number)
  const bookedDay = new Date(y, m - 1, d)

  const diffDays = Math.round((bookedDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays >= 7) return 1.0  // 全額返金
  if (diffDays >= 3) return 0.7  // 30%キャンセル料
  if (diffDays >= 1) return 0.5  // 50%キャンセル料
  return 0.0                      // 当日・過去：返金なし
}
