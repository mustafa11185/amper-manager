import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's shift
    const shift = await prisma.collectorShift.findUnique({
      where: {
        staff_id_shift_date: {
          staff_id: user.id,
          shift_date: today,
        },
      },
    })

    // Get today's invoices collected by this staff
    const todayEnd = new Date(today)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const invoices = await prisma.invoice.findMany({
      where: {
        collector_id: user.id,
        updated_at: { gte: today, lt: todayEnd },
      },
    })

    let totalCash = 0
    let totalCard = 0

    for (const inv of invoices) {
      const paid = Number(inv.amount_paid)
      if (inv.payment_method === 'card') totalCard += paid
      else totalCash += paid
    }

    const totalCollected = totalCash + totalCard

    // Create or update daily report
    const report = await prisma.collectorDailyReport.upsert({
      where: {
        id: `${user.id}-${today.toISOString().split('T')[0]}`,
      },
      create: {
        staff_id: user.id,
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        report_date: today,
        total_cash: totalCash,
        total_card: totalCard,
        total_electronic: totalCard,
        total_collected: totalCollected,
        invoices_count: invoices.length,
        subscribers_visited: shift?.visited_subscribers || 0,
        whatsapp_sent: true,
        whatsapp_sent_at: new Date(),
      },
      update: {
        total_cash: totalCash,
        total_card: totalCard,
        total_electronic: totalCard,
        total_collected: totalCollected,
        invoices_count: invoices.length,
        subscribers_visited: shift?.visited_subscribers || 0,
        whatsapp_sent: true,
        whatsapp_sent_at: new Date(),
      },
    })

    return NextResponse.json({
      report,
      summary: {
        total_cash: totalCash,
        total_card: totalCard,
        total_collected: totalCollected,
        invoices_count: invoices.length,
        visited: shift?.visited_subscribers || 0,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
