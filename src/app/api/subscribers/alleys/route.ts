import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string
  const branchId = user.branchId as string | undefined

  const branchFilter = user.role === 'owner'
    ? { tenant_id: tenantId }
    : { id: branchId }

  const branches = await prisma.branch.findMany({
    where: branchFilter,
    select: { id: true },
  })
  const branchIds = branches.map(b => b.id)

  // Get active billing month from latest pricing
  const latestPricing = await prisma.monthlyPricing.findFirst({
    where: { branch_id: { in: branchIds } },
    orderBy: { effective_from: 'desc' },
  })
  let bMonth = new Date().getMonth() + 1
  let bYear = new Date().getFullYear()
  if (latestPricing) {
    const eff = new Date(latestPricing.effective_from)
    bMonth = eff.getMonth() + 1
    bYear = eff.getFullYear()
  }

  // Get IDs of subscribers who have fully-paid invoice for active billing month
  const paidThisMonth = await prisma.invoice.findMany({
    where: {
      branch_id: { in: branchIds },
      billing_month: bMonth,
      billing_year: bYear,
      is_fully_paid: true,
    },
    select: { subscriber_id: true },
    distinct: ['subscriber_id'],
  })
  const paidIds = new Set(paidThisMonth.map(i => i.subscriber_id))

  // Get alleys from the Alley table with subscriber counts
  const alleyRecords = await prisma.alley.findMany({
    where: {
      branch_id: { in: branchIds },
      is_active: true,
    },
    orderBy: { sort_order: 'asc' },
    include: {
      subscribers: {
        where: { is_active: true },
        select: { id: true },
      },
    },
  })

  const alleys = alleyRecords.map(a => {
    const total = a.subscribers.length
    const unpaid = a.subscribers.filter(s => !paidIds.has(s.id)).length
    return { id: a.id, name: a.name, total, unpaid }
  })

  return NextResponse.json({ alleys })
}
