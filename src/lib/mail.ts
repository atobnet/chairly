import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendBookingRequestMail({
  toEmail,
  toName,
  consumerName,
  date,
  time,
  menu,
  salonName,
}: {
  toEmail: string
  toName: string
  consumerName: string
  date: string
  time: string
  menu: string
  salonName: string
}) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `【Chairly】新しい予約リクエストが届きました`,
    html: `
      <p>${toName} さん</p>
      <p>新しい予約リクエストが届いています。</p>
      <table style="border-collapse:collapse;margin:1rem 0">
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">お客様</td><td style="padding:0.4rem 0">${consumerName}</td></tr>
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">日時</td><td style="padding:0.4rem 0">${date} ${time}</td></tr>
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">メニュー</td><td style="padding:0.4rem 0">${menu}</td></tr>
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">サロン</td><td style="padding:0.4rem 0">${salonName}</td></tr>
      </table>
      <p><a href="https://chairly-one.vercel.app/requests" style="color:#111">予約リクエストを確認する →</a></p>
    `,
  })
}

export async function sendBookingConfirmedMail({
  toEmail,
  toName,
  hairdresserName,
  date,
  time,
  salonName,
}: {
  toEmail: string
  toName: string
  hairdresserName: string
  date: string
  time: string
  salonName: string
}) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `【Chairly】予約が確定しました`,
    html: `
      <p>${toName} さん</p>
      <p>${hairdresserName} さんが予約を確定しました。</p>
      <table style="border-collapse:collapse;margin:1rem 0">
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">日時</td><td style="padding:0.4rem 0">${date} ${time}</td></tr>
        <tr><td style="padding:0.4rem 1rem 0.4rem 0;color:#666">サロン</td><td style="padding:0.4rem 0">${salonName}</td></tr>
      </table>
      <p><a href="https://chairly-one.vercel.app/bookings" style="color:#111">予約詳細を確認する →</a></p>
    `,
  })
}

export async function sendBookingCancelledMail({
  toEmail,
  toName,
  date,
  time,
}: {
  toEmail: string
  toName: string
  date: string
  time: string
}) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `【Chairly】予約がキャンセルされました`,
    html: `
      <p>${toName} さん</p>
      <p>${date} ${time} の予約がキャンセルされました。</p>
      <p><a href="https://chairly-one.vercel.app/search" style="color:#111">別の美容師を探す →</a></p>
    `,
  })
}
