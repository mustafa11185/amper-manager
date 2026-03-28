import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const tenantId = user.tenantId as string

  const branches = await prisma.branch.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: {
      id: true,
      name: true,
      generators: {
        where: { is_active: true },
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json({ branches })
}
