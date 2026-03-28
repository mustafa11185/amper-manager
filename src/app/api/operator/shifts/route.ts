import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staff_id') || (session.user as any).id
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

  const shifts = await prisma.operatorShift.findMany({
    where: { staff_id: staffId },
    orderBy: { shift_date: 'desc' },
    take: limit,
  })

  return NextResponse.json({ shifts })
}
