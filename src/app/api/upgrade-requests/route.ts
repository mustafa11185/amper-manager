import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  const branches = await prisma.branch.findMany({
    where: user.role === 'owner' ? { tenant_id: user.tenantId } : { id: user.branchId },
    select: { id: true },
  })

  const requests = await prisma.upgradeRequest.findMany({
    where: { branch_id: { in: branches.map(b => b.id) } },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { subscriber_id, branch_id, from_type, to_type } = await req.json()

    const request = await prisma.upgradeRequest.create({
      data: {
        subscriber_id,
        branch_id,
        from_type,
        to_type,
        requested_by: 'staff',
      },
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
