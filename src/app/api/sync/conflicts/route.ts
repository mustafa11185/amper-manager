import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  const branches = await prisma.branch.findMany({
    where: user.role === 'owner' ? { tenant_id: user.tenantId } : { id: user.branchId },
    select: { id: true },
  })

  const conflicts = await prisma.offlineSyncQueue.findMany({
    where: {
      branch_id: { in: branches.map(b => b.id) },
      status: 'conflict',
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ conflicts })
}
