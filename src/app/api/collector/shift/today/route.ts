import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staff_id') || (session.user as any).id

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const shift = await prisma.collectorShift.findUnique({
    where: {
      staff_id_shift_date: {
        staff_id: staffId,
        shift_date: today,
      },
    },
  })

  return NextResponse.json({ shift })
}
