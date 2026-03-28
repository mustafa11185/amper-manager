import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner' && user.role !== 'operator') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params

  try {
    const { run_status } = await req.json()

    const generator = await prisma.generator.update({
      where: { id },
      data: { run_status },
    })

    return NextResponse.json({ generator })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
