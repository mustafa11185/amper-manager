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

    const shift = await prisma.operatorShift.findUnique({
      where: {
        staff_id_shift_date: {
          staff_id: user.id,
          shift_date: today,
        },
      },
    })

    if (!shift || !shift.check_in_at) {
      return NextResponse.json({ error: 'لم يتم تسجيل الحضور' }, { status: 400 })
    }

    const hoursWorked = (Date.now() - new Date(shift.check_in_at).getTime()) / 3600000

    const updated = await prisma.operatorShift.update({
      where: { id: shift.id },
      data: {
        check_out_at: new Date(),
        check_out_lat: gps_lat || null,
        check_out_lng: gps_lng || null,
        check_out_selfie: selfie_url || null,
        hours_worked: Math.round(hoursWorked * 100) / 100,
        status: 'completed',
      },
    })

    return NextResponse.json({ shift: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
