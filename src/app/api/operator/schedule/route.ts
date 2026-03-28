import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  try {
    const { staff_id, generator_id, branch_id, schedules } = await req.json()

    // schedules: [{ day_of_week, shift_start, shift_end }]
    if (!staff_id || !generator_id || !Array.isArray(schedules)) {
      return NextResponse.json({ error: 'بيانات غير كافية' }, { status: 400 })
    }

    // Delete existing schedules for this staff+generator
    await prisma.operatorSchedule.deleteMany({
      where: { staff_id, generator_id },
    })

    // Create new schedules
    const created = await prisma.operatorSchedule.createMany({
      data: schedules.map((s: any) => ({
        staff_id,
        generator_id,
        branch_id: branch_id || user.branchId,
        tenant_id: user.tenantId,
        day_of_week: s.day_of_week,
        shift_start: s.shift_start,
        shift_end: s.shift_end,
      })),
    })

    return NextResponse.json({ count: created.count }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
