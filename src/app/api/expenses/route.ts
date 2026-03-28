import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const tenantId = user.tenantId as string
  const branchFilter = user.role === 'owner' ? { branch: { tenant_id: tenantId } } : { branch_id: user.branchId }
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
  const expenses = await prisma.expense.findMany({
    where: { ...branchFilter, created_at: { gte: monthStart } },
    orderBy: { created_at: 'desc' },
    take: 100,
  })
  const total = expenses.reduce((a: number, e: any) => a + Number(e.amount), 0)
  return NextResponse.json({ expenses: expenses.map((e: any) => ({ id: e.id, category: e.category, amount: Number(e.amount), description: e.description, created_at: e.created_at.toISOString() })), monthly_total: total })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const { category, amount, description } = await req.json()
  if (!category || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const branches = await prisma.branch.findMany({ where: { tenant_id: user.tenantId }, select: { id: true }, take: 1 })
  const branchId = user.branchId || branches[0]?.id
  if (!branchId) return NextResponse.json({ error: 'No branch' }, { status: 400 })
  await prisma.expense.create({ data: { branch_id: branchId, staff_id: user.id, category, amount: Number(amount), description: description || null } })
  return NextResponse.json({ ok: true })
}
