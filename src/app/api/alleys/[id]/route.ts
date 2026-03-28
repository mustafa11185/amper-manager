import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data: any = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.sort_order !== undefined) data.sort_order = body.sort_order
    if (body.is_active !== undefined) data.is_active = body.is_active

    const alley = await prisma.alley.update({ where: { id }, data })
    return NextResponse.json({ alley })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الاسم موجود بالفعل' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Unlink subscribers first
    await prisma.subscriber.updateMany({
      where: { alley_id: id },
      data: { alley_id: null },
    })
    await prisma.alley.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
