import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { subscription_type } = await req.json()
    if (!subscription_type || !['gold', 'normal'].includes(subscription_type)) {
      return NextResponse.json({ error: 'نوع الاشتراك غير صالح' }, { status: 400 })
    }

    const subscriber = await prisma.subscriber.update({
      where: { id },
      data: { subscription_type },
    })

    return NextResponse.json({ subscriber })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تغيير نوع الاشتراك' }, { status: 500 })
  }
}
