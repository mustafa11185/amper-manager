import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string
  const branchId = req.nextUrl.searchParams.get('branch_id') || user.branchId

  const where: any = { tenant_id: tenantId }
  if (branchId) where.branch_id = branchId

  const alleys = await prisma.alley.findMany({
    where,
    orderBy: { sort_order: 'asc' },
    include: {
      _count: { select: { subscribers: true } },
    },
  })

  return NextResponse.json({ alleys })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string

  try {
    const { name, branch_id, sort_order } = await req.json()

    if (!name?.trim() || !branch_id) {
      return NextResponse.json({ error: 'الاسم والفرع مطلوبان' }, { status: 400 })
    }

    const alley = await prisma.alley.create({
      data: {
        branch_id,
        tenant_id: tenantId,
        name: name.trim(),
        sort_order: sort_order ?? 0,
      },
    })

    return NextResponse.json({ alley }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الزقاق موجود بالفعل' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
