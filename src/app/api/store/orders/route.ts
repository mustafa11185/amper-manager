import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')

  const where: any = {}
  if (status) where.status = status

  const orders = await prisma.storeOrder.findMany({
    where,
    include: {
      product: { select: { name_ar: true, price_usd: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ orders })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, status } = await req.json()
    const order = await prisma.storeOrder.update({
      where: { id },
      data: { status },
    })
    return NextResponse.json({ order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
