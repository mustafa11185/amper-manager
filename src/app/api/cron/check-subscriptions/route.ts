import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const now = new Date()
    const tenants = await prisma.tenant.findMany({
      where: { is_active: true, subscription_ends_at: { not: null } },
    })

    let gracePeriodCount = 0
    let lockedCount = 0

    for (const tenant of tenants) {
      const subEnd = tenant.subscription_ends_at!
      const graceEnd = tenant.grace_period_ends_at
        ?? new Date(subEnd.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days grace

      if (now > subEnd && now <= graceEnd) {
        // In grace period
        if (!tenant.is_in_grace_period) {
          const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              is_in_grace_period: true,
              grace_period_ends_at: graceEnd,
            },
          })

          // Get owner's branch for notification
          const branch = await prisma.branch.findFirst({
            where: { tenant_id: tenant.id, is_active: true },
          })
          if (branch) {
            await prisma.notification.create({
              data: {
                branch_id: branch.id,
                tenant_id: tenant.id,
                type: 'subscription_warning',
                title: 'اشتراك على وشك الانتهاء ⚠️',
                body: `⚠️ اشتراكك انتهى — لديك ${daysLeft} أيام للتجديد`,
                payload: { days_left: daysLeft, grace_ends: graceEnd.toISOString() },
              },
            })
          }
          gracePeriodCount++
        }
      } else if (now > graceEnd) {
        // Past grace period — lock
        if (tenant.is_active) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              is_active: false,
              locked_at: now,
              is_in_grace_period: false,
            },
          })

          const branch = await prisma.branch.findFirst({
            where: { tenant_id: tenant.id },
          })
          if (branch) {
            await prisma.notification.create({
              data: {
                branch_id: branch.id,
                tenant_id: tenant.id,
                type: 'subscription_locked',
                title: 'تم إيقاف الحساب 🔴',
                body: '🔴 تم إيقاف حسابك — تواصل مع أمبير للتجديد',
              },
            })
          }
          lockedCount++
        }
      }
    }

    return NextResponse.json({ ok: true, grace_period: gracePeriodCount, locked: lockedCount })
  } catch (err: any) {
    console.error('[check-subscriptions] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
