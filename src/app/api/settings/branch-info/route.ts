import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string

  // Get the first active branch for the tenant
  const branch = await prisma.branch.findFirst({
    where: { tenant_id: tenantId, is_active: true },
    select: { id: true, whatsapp_number: true, gps_lat: true, gps_lng: true, address: true },
  })

  if (!branch) return NextResponse.json({ error: 'لا يوجد فرع' }, { status: 404 })

  return NextResponse.json({
    branch_id: branch.id,
    whatsapp_number: branch.whatsapp_number,
    gps_lat: branch.gps_lat ? Number(branch.gps_lat) : null,
    gps_lng: branch.gps_lng ? Number(branch.gps_lng) : null,
    address: branch.address,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const tenantId = user.tenantId as string

  try {
    const { whatsapp_number, gps_lat, gps_lng, address } = await req.json()

    const branch = await prisma.branch.findFirst({
      where: { tenant_id: tenantId, is_active: true },
    })
    if (!branch) return NextResponse.json({ error: 'لا يوجد فرع' }, { status: 404 })

    await prisma.branch.update({
      where: { id: branch.id },
      data: {
        whatsapp_number: whatsapp_number || null,
        gps_lat: gps_lat != null ? gps_lat : null,
        gps_lng: gps_lng != null ? gps_lng : null,
        address: address || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
