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

  const generators = await prisma.generator.findMany({
    where: { branch_id: { in: branchIds } },
    include: {
      engines: {
        include: {
          temperature_logs: {
            orderBy: { logged_at: 'desc' },
            take: 1,
          },
          fuel_logs: {
            orderBy: { logged_at: 'desc' },
            take: 1,
          },
        },
      },
      manual_overrides: {
        where: { deactivated_at: null },
        orderBy: { activated_at: 'desc' },
        take: 1,
      },
    },
  })

  return NextResponse.json({ generators })
}
