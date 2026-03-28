import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const { gold_hours, normal_hours, branch_id } = await req.json()

  if (gold_hours == null && normal_hours == null) {
    return NextResponse.json({ error: 'ادخل الساعات' }, { status: 400 })
  }

  const targetBranch = branch_id || user.branchId
  if (!targetBranch) return NextResponse.json({ error: 'لا يوجد فرع' }, { status: 400 })

  // Find generator for this branch
  const generator = await prisma.generator.findFirst({
    where: { branch_id: targetBranch, is_active: true },
  })
  if (!generator) return NextResponse.json({ error: 'لا يوجد مولدة' }, { status: 404 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Create NormalCutLog entries for manual hours
  if (normal_hours != null && Number(normal_hours) > 0) {
    const normalMin = Math.round(Number(normal_hours) * 60)
    await prisma.normalCutLog.create({
      data: {
        branch_id: targetBranch,
        generator_id: generator.id,
        cut_start: todayStart,
        cut_end: new Date(todayStart.getTime() + normalMin * 60000),
        duration_min: normalMin,
        source: 'manual',
      },
    })
  }

  return NextResponse.json({ ok: true })
}
