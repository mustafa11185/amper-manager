import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staff_id')
  const months = parseInt(req.nextUrl.searchParams.get('months') || '3')

  if (!staffId) return NextResponse.json({ error: 'staff_id مطلوب' }, { status: 400 })

  const since = new Date()
  since.setMonth(since.getMonth() - months)

  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      from_staff_id: staffId,
      delivered_at: { gte: since },
    },
    orderBy: { delivered_at: 'desc' },
  })

  return NextResponse.json({ deliveries })
}
