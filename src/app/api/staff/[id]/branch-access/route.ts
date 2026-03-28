import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = session.user as any

  const branches = await prisma.branch.findMany({
    where: { tenant_id: user.tenantId, is_active: true },
    select: { id: true, name: true },
  })

  const access = await prisma.staffBranchAccess.findMany({
    where: { staff_id: id },
    select: { branch_id: true, can_edit: true },
  })

  const accessMap = new Map(access.map(a => [a.branch_id, a]))

  return NextResponse.json({
    branches: branches.map(b => ({
      id: b.id,
      name: b.name,
      has_access: accessMap.has(b.id),
      can_edit: accessMap.get(b.id)?.can_edit ?? false,
    })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params
  const { branch_ids } = await req.json()

  // Remove all existing access
  await prisma.staffBranchAccess.deleteMany({ where: { staff_id: id } })

  // Create new access records
  if (Array.isArray(branch_ids) && branch_ids.length > 0) {
    await prisma.staffBranchAccess.createMany({
      data: branch_ids.map((bid: string) => ({
        staff_id: id,
        branch_id: bid,
        can_edit: false,
      })),
    })
  }

  return NextResponse.json({ ok: true })
}
