import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  try {
    const { lat, lng, accuracy } = await req.json()

    const log = await prisma.staffGpsLog.create({
      data: {
        staff_id: user.id,
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        lat,
        lng,
        accuracy_m: accuracy || null,
        source: 'auto',
      },
    })

    return NextResponse.json({ log })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
