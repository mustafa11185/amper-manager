import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      collector_permission: true,
      operator_permission: true,
      branch: { select: { name: true } },
    },
  })

  if (!staff) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  return NextResponse.json({ staff })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()

    // Update staff fields
    const staffData: any = {}
    if (body.name !== undefined) staffData.name = body.name
    if (body.phone !== undefined) staffData.phone = body.phone
    if (body.pin !== undefined) staffData.pin = body.pin
    if (body.is_active !== undefined) staffData.is_active = body.is_active
    if (body.can_collect !== undefined) staffData.can_collect = body.can_collect
    if (body.can_operate !== undefined) staffData.can_operate = body.can_operate
    if (body.is_owner_acting !== undefined) staffData.is_owner_acting = body.is_owner_acting

    const staff = await prisma.staff.update({
      where: { id },
      data: staffData,
    })

    // Update collector permissions if provided
    if (body.collector_permission) {
      await prisma.collectorPermission.upsert({
        where: { staff_id: id },
        create: { staff_id: id, tenant_id: staff.tenant_id, ...body.collector_permission },
        update: body.collector_permission,
      })
    }

    // Update operator permissions if provided
    if (body.operator_permission) {
      await prisma.operatorPermission.upsert({
        where: { staff_id: id },
        create: { staff_id: id, tenant_id: staff.tenant_id, ...body.operator_permission },
        update: body.operator_permission,
      })
    }

    return NextResponse.json({ staff })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
