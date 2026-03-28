import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
  if (!tenant) return NextResponse.json({})

  if (tenant.is_in_grace_period && tenant.grace_period_ends_at) {
    const daysLeft = Math.max(0, Math.ceil(
      (tenant.grace_period_ends_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ))
    return NextResponse.json({ is_in_grace_period: true, days_left: daysLeft })
  }

  return NextResponse.json({ is_in_grace_period: false })
}
