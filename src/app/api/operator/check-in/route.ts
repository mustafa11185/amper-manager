import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  try {
    const { gps_lat, gps_lng, selfie_url } = await req.json()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's shift
    const shift = await prisma.operatorShift.upsert({
      where: {
        staff_id_shift_date: {
          staff_id: user.id,
          shift_date: today,
        },
      },
      create: {
        staff_id: user.id,
        generator_id: user.generatorId || '',
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        shift_date: today,
        check_in_at: new Date(),
        check_in_lat: gps_lat || null,
        check_in_lng: gps_lng || null,
        check_in_selfie: selfie_url || null,
        check_in_valid: true,
        status: 'checked_in',
      },
      update: {
        check_in_at: new Date(),
        check_in_lat: gps_lat || null,
        check_in_lng: gps_lng || null,
        check_in_selfie: selfie_url || null,
        check_in_valid: true,
        status: 'checked_in',
      },
    })

    return NextResponse.json({ shift })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تسجيل الحضور' }, { status: 500 })
  }
}
