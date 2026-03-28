import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { branch_id } = await req.json()
    const tenantId = user.tenantId as string

    // Get the latest pricing for this branch
    const branchFilter = branch_id
      ? { id: branch_id, tenant_id: tenantId }
      : { tenant_id: tenantId }

    const branches = await prisma.branch.findMany({
      where: branchFilter,
      select: { id: true },
    })
    const branchIds = branches.map(b => b.id)

    if (branchIds.length === 0) {
      return NextResponse.json({ error: 'لا توجد فروع' }, { status: 400 })
    }

    // Get latest pricing per branch
    const pricingMap = new Map<string, { price_normal: number; price_gold: number; month: number; year: number }>()
    for (const bid of branchIds) {
      const pricing = await prisma.monthlyPricing.findFirst({
        where: { branch_id: bid },
        orderBy: { effective_from: 'desc' },
      })
      if (pricing) {
        const effectiveDate = new Date(pricing.effective_from)
        pricingMap.set(bid, {
          price_normal: Number(pricing.price_per_amp_normal),
          price_gold: Number(pricing.price_per_amp_gold),
          month: effectiveDate.getMonth() + 1,
          year: effectiveDate.getFullYear(),
        })
      }
    }

    if (pricingMap.size === 0) {
      return NextResponse.json({ error: 'لم يتم تحديد تسعير — احفظ التسعير أولاً' }, { status: 400 })
    }

    // Check if invoices already exist for this billing period (once-per-month guard)
    for (const [bid, p] of pricingMap) {
      const existingCount = await prisma.invoice.count({
        where: { branch_id: bid, billing_month: p.month, billing_year: p.year },
      })
      if (existingCount > 0) {
        return NextResponse.json({
          error: `تم إصدار فواتير شهر ${p.month}/${p.year} مسبقاً (${existingCount} فاتورة)`,
          invoices_created: 0,
          invoices_skipped: existingCount,
          total_subscribers: 0,
          billing_month: p.month,
          billing_year: p.year,
          already_generated: true,
        }, { status: 409 })
      }
    }

    let totalCreated = 0
    let totalSkipped = 0
    let totalSubscribers = 0

    await prisma.$transaction(async (tx) => {
      for (const [bid, pricing] of pricingMap) {
        const { price_normal, price_gold, month, year } = pricing

        // Get all active subscribers in this branch
        const subscribers = await tx.subscriber.findMany({
          where: { branch_id: bid, is_active: true },
          select: { id: true, amperage: true, subscription_type: true, total_debt: true },
        })

        for (const sub of subscribers) {
          totalSubscribers++
          // Check if invoice already exists for this month
          const existing = await tx.invoice.findFirst({
            where: {
              subscriber_id: sub.id,
              billing_month: month,
              billing_year: year,
            },
          })
          if (existing) { totalSkipped++; continue }

          // Move any unpaid past invoices to total_debt
          const unpaidPast = await tx.invoice.findMany({
            where: {
              subscriber_id: sub.id,
              is_fully_paid: false,
              NOT: { billing_month: month, billing_year: year },
            },
          })

          let debtToAdd = 0
          for (const inv of unpaidPast) {
            const remaining = Number(inv.total_amount_due) - Number(inv.amount_paid)
            if (remaining > 0) debtToAdd += remaining
          }

          if (debtToAdd > 0) {
            await tx.subscriber.update({
              where: { id: sub.id },
              data: { total_debt: { increment: debtToAdd } },
            })
            // Mark old unpaid invoices as settled (moved to debt)
            for (const inv of unpaidPast) {
              await tx.invoice.update({
                where: { id: inv.id },
                data: { is_fully_paid: true },
              })
            }
          }

          // Calculate new invoice amount
          const amperage = Number(sub.amperage)
          const pricePerAmp = sub.subscription_type === 'gold' ? price_gold : price_normal
          const totalDue = Math.round(amperage * pricePerAmp)

          // Create new invoice
          await tx.invoice.create({
            data: {
              subscriber_id: sub.id,
              branch_id: bid,
              tenant_id: tenantId,
              billing_month: month,
              billing_year: year,
              base_amount: totalDue,
              total_amount_due: totalDue,
            },
          })

          totalCreated++
        }
      }
    })

    return NextResponse.json({
      invoices_created: totalCreated,
      invoices_skipped: totalSkipped,
      total_subscribers: totalSubscribers,
      billing_month: pricingMap.values().next().value?.month,
      billing_year: pricingMap.values().next().value?.year,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في إصدار الفواتير' }, { status: 500 })
  }
}
