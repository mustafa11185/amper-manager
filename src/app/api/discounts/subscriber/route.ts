import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string

  const discounts = await prisma.subscriberDiscount.findMany({
    where: { tenant_id: tenantId, is_active: true },
    include: {
      subscriber: { select: { name: true, serial_number: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ discounts })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string

  try {
    const { subscriber_id, discount_type, discount_value, reason, valid_until, branch_id } = await req.json()

    if (!discount_type || !discount_value || !branch_id) {
      return NextResponse.json({ error: 'بيانات غير كافية' }, { status: 400 })
    }

    const discount = await prisma.subscriberDiscount.create({
      data: {
        subscriber_id: subscriber_id || null,
        branch_id,
        tenant_id: tenantId,
        discount_type,
        discount_value,
        reason: reason || null,
        valid_until: valid_until ? new Date(valid_until) : null,
        applied_by: user.id || user.name || 'owner',
      },
    })

    return NextResponse.json({ discount }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
