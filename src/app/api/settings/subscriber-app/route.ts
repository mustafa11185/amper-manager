import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const generator = await prisma.generator.findFirst({
    where: { branch: { tenant_id: user.tenantId } },
    include: { subscriber_app_settings: true },
  })

  return NextResponse.json({
    settings: generator?.subscriber_app_settings ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { primary_color, welcome_message } = await req.json()

  const generator = await prisma.generator.findFirst({
    where: { branch: { tenant_id: user.tenantId } },
  })
  if (!generator) return NextResponse.json({ error: 'لا يوجد مولدة' }, { status: 404 })

  await prisma.subscriberAppSettings.upsert({
    where: { generator_id: generator.id },
    create: {
      generator_id: generator.id,
      tenant_id: user.tenantId,
      primary_color: primary_color || '#1B4FD8',
      welcome_message: welcome_message || null,
      is_active: true,
    },
    update: {
      primary_color: primary_color || '#1B4FD8',
      welcome_message: welcome_message || null,
      is_active: true,
    },
  })

  return NextResponse.json({ ok: true })
}
