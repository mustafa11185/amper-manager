import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string
  const branchId = user.branchId as string | undefined
  const { id } = await params

  // Scope to user's accessible branches
  const branchFilter = user.role === 'owner'
    ? { tenant_id: tenantId }
    : { id: branchId }

  const branches = await prisma.branch.findMany({
    where: branchFilter,
    select: { id: true },
  })
  const branchIds = branches.map(b => b.id)

  await prisma.notification.updateMany({
    where: {
      id,
      branch_id: { in: branchIds },
    },
    data: { is_read: true },
  })

  return NextResponse.json({ ok: true })
}
