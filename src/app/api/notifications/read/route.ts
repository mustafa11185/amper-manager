import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const body = await req.json()
    const ids: string[] = body.ids

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    // Get branches the user has access to, to scope the update
    const branches = await prisma.branch.findMany({
      where: user.role === 'owner'
        ? { tenant_id: user.tenantId }
        : { id: user.branchId },
      select: { id: true },
    })

    const branchIds = branches.map(b => b.id)

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        branch_id: { in: branchIds },
      },
      data: { is_read: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
