import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staff_id') || (session.user as any).id

  const permission = await prisma.operatorPermission.findUnique({
    where: { staff_id: staffId },
  })

  return NextResponse.json({ permission })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { staff_id, ...data } = body

    const permission = await prisma.operatorPermission.upsert({
      where: { staff_id },
      create: { staff_id, tenant_id: (session.user as any).tenantId, ...data },
      update: data,
    })

    return NextResponse.json({ permission })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
