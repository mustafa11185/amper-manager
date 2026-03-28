import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const branchId = req.nextUrl.searchParams.get('branch_id') || user.branchId
  const status = req.nextUrl.searchParams.get('status') || 'pending'

  const where: any = { tenant_id: user.tenantId }
  if (branchId) where.branch_id = branchId
  if (status) where.status = status

  const requests = await prisma.collectorDiscountRequest.findMany({
    where,
    include: {
      subscriber: { select: { name: true, serial_number: true } },
      staff: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ requests })
}
