import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const staffId = user.id as string

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get invoices collected by this staff today
  const invoices = await prisma.invoice.findMany({
    where: {
      collector_id: staffId,
      updated_at: { gte: today, lt: tomorrow },
      amount_paid: { gt: 0 },
    },
    select: { amount_paid: true, payment_method: true },
  })

  let totalCash = 0
  let totalCard = 0

  for (const inv of invoices) {
    const paid = Number(inv.amount_paid)
    if (inv.payment_method === 'card') totalCard += paid
    else totalCash += paid
  }

  return NextResponse.json({
    total_cash: totalCash,
    total_card: totalCard,
    total_collected: totalCash + totalCard,
    invoices_count: invoices.length,
  })
}
