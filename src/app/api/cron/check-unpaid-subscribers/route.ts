import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const now = new Date()

    // Find all active subscribers with 3+ unpaid invoices
    const subscribers = await prisma.subscriber.findMany({
      where: { is_active: true },
      include: {
        invoices: { where: { is_fully_paid: false } },
      },
    })

    let flagged = 0

    for (const sub of subscribers) {
      if (sub.invoices.length >= 3) {
        // Flag subscriber
        if (!sub.needs_attention) {
          await prisma.subscriber.update({
            where: { id: sub.id },
            data: { needs_attention: true },
          })
        }

        // Check if we already notified today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const existingNotif = await prisma.notification.findFirst({
          where: {
            branch_id: sub.branch_id,
            type: 'subscriber_unpaid_alert',
            created_at: { gte: todayStart },
            payload: { path: ['subscriber_id'], equals: sub.id },
          },
        })

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              branch_id: sub.branch_id,
              tenant_id: sub.tenant_id,
              type: 'subscriber_unpaid_alert',
              title: 'مشترك متأخر ⚠️',
              body: `⚠️ ${sub.name} لم يدفع منذ ${sub.invoices.length} أشهر — الدين: ${Number(sub.total_debt).toLocaleString()} د.ع`,
              payload: { subscriber_id: sub.id, unpaid_months: sub.invoices.length },
            },
          })
          flagged++
        }
      } else if (sub.needs_attention && sub.invoices.length < 3) {
        // Clear flag if now below threshold
        await prisma.subscriber.update({
          where: { id: sub.id },
          data: { needs_attention: false },
        })
      }
    }

    return NextResponse.json({ ok: true, flagged, checked: subscribers.length })
  } catch (err: any) {
    console.error('[check-unpaid] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
