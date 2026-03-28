import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const logs = await prisma.staffGpsLog.findMany({
    where: {
      staff_id: id,
      tenant_id: user.tenantId,
      recorded_at: { gte: since },
    },
    orderBy: { recorded_at: 'desc' },
    select: {
      id: true,
      lat: true,
      lng: true,
      accuracy_m: true,
      source: true,
      recorded_at: true,
    },
  })

  return NextResponse.json({
    logs: logs.map(l => ({
      ...l,
      lat: Number(l.lat),
      lng: Number(l.lng),
    })),
  })
}
