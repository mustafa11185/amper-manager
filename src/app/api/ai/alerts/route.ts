import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const branchId = req.nextUrl.searchParams.get('branch_id') || user.branchId

  const branches = await prisma.branch.findMany({
    where: user.role === 'owner' ? { tenant_id: user.tenantId } : { id: branchId },
    select: { id: true },
  })

  const alerts = await prisma.notification.findMany({
    where: {
      branch_id: { in: branches.map(b => b.id) },
      type: 'alert',
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  })

  return NextResponse.json({ alerts })
}
