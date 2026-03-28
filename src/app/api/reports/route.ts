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
    where: user.role === 'owner' ? { tenant_id: tenantId } : { id: user.branchId },
    select: { id: true },
  })
  const branchIds = branches.map(b => b.id)
  if (branchIds.length === 0) return NextResponse.json({ error: 'لا يوجد فرع' }, { status: 404 })

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  try {
    // ── A) FINANCIAL ──
    // Last 6 months revenue
    const monthlyRevenue: { month: number; year: number; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const agg = await prisma.invoice.aggregate({
        _sum: { amount_paid: true },
        where: { branch_id: { in: branchIds }, billing_month: m, billing_year: y },
      })
      monthlyRevenue.push({ month: m, year: y, total: Number(agg._sum.amount_paid ?? 0) })
    }

    // This month cash vs online
    const cashThisMonth = await prisma.invoice.aggregate({
      _sum: { amount_paid: true },
      where: {
        branch_id: { in: branchIds }, billing_month: currentMonth, billing_year: currentYear,
        payment_method: { notIn: ['furatpay'] },
      },
    })
    const onlineThisMonth = await prisma.onlinePayment.aggregate({
      _sum: { amount: true },
      where: { tenant_id: tenantId, status: 'success', created_at: { gte: new Date(currentYear, currentMonth - 1, 1) } },
    })
    const totalDebtAgg = await prisma.subscriber.aggregate({
      _sum: { total_debt: true },
      where: { branch_id: { in: branchIds }, is_active: true },
    })
    const totalInvoices = await prisma.invoice.count({
      where: { branch_id: { in: branchIds }, billing_month: currentMonth, billing_year: currentYear },
    })
    const paidInvoices = await prisma.invoice.count({
      where: { branch_id: { in: branchIds }, billing_month: currentMonth, billing_year: currentYear, is_fully_paid: true },
    })

    // ── B) SUBSCRIBERS ──
    const totalActive = await prisma.subscriber.count({ where: { branch_id: { in: branchIds }, is_active: true } })
    const goldCount = await prisma.subscriber.count({ where: { branch_id: { in: branchIds }, is_active: true, subscription_type: 'gold' } })
    const normalCount = await prisma.subscriber.count({ where: { branch_id: { in: branchIds }, is_active: true, subscription_type: 'normal' } })
    const goldAmp = await prisma.subscriber.aggregate({ _sum: { amperage: true }, where: { branch_id: { in: branchIds }, is_active: true, subscription_type: 'gold' } })
    const normalAmp = await prisma.subscriber.aggregate({ _sum: { amperage: true }, where: { branch_id: { in: branchIds }, is_active: true, subscription_type: 'normal' } })

    const unpaidSubs = await prisma.subscriber.findMany({
      where: { branch_id: { in: branchIds }, is_active: true },
      select: { id: true, name: true, total_debt: true },
    })
    const unpaidList = unpaidSubs.filter(s => Number(s.total_debt) > 0)
    const topDebtors = unpaidList.sort((a, b) => Number(b.total_debt) - Number(a.total_debt)).slice(0, 5)

    // ── C) COLLECTORS ──
    const staff = await prisma.staff.findMany({
      where: { tenant_id: tenantId, is_active: true, role: 'collector' },
      select: { id: true, name: true },
    })
    const collectorStats = await Promise.all(staff.map(async (s) => {
      const wallet = await prisma.collectorWallet.findUnique({ where: { staff_id: s.id } })
      const paymentCount = await prisma.posTransaction.count({
        where: { staff_id: s.id, created_at: { gte: new Date(currentYear, currentMonth - 1, 1) } },
      })
      const shifts = await prisma.collectorShift.findMany({
        where: { staff_id: s.id, shift_date: { gte: new Date(currentYear, currentMonth - 1, 1) } },
      })
      const lateDays = shifts.filter(sh => (sh.late_minutes ?? 0) > 0).length
      return {
        id: s.id, name: s.name,
        collected: Number(wallet?.total_collected ?? 0),
        delivered: Number(wallet?.total_delivered ?? 0),
        balance: Number(wallet?.balance ?? 0),
        payment_count: paymentCount,
        late_days: lateDays,
      }
    }))

    // ── D) EXPENSES ──
    const expensesThisMonth = await prisma.expense.findMany({
      where: { branch_id: { in: branchIds }, created_at: { gte: new Date(currentYear, currentMonth - 1, 1) } },
    })
    const expenseByCategory: Record<string, number> = {}
    let totalExpenses = 0
    for (const e of expensesThisMonth) {
      const cat = e.category || 'أخرى'
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount)
      totalExpenses += Number(e.amount)
    }

    // ── E) ATTENDANCE ──
    const allStaff = await prisma.staff.findMany({
      where: { tenant_id: tenantId, is_active: true, role: { in: ['collector', 'operator'] } },
      select: { id: true, name: true, role: true },
    })
    const attendanceStats = await Promise.all(allStaff.map(async (s) => {
      const shifts = s.role === 'collector'
        ? await prisma.collectorShift.findMany({
            where: { staff_id: s.id, shift_date: { gte: new Date(currentYear, currentMonth - 1, 1) } },
          })
        : await prisma.operatorShift.findMany({
            where: { staff_id: s.id, shift_date: { gte: new Date(currentYear, currentMonth - 1, 1) } },
          })
      const present = shifts.filter(sh => sh.check_in_at !== null).length
      const totalLateMin = shifts.reduce((sum, sh) => sum + ((sh as any).late_minutes ?? 0), 0)
      const lateDays = shifts.filter(sh => ((sh as any).late_minutes ?? 0) > 0).length
      const workingDays = Math.min(now.getDate(), 30)
      return {
        id: s.id, name: s.name, role: s.role,
        present, absent: workingDays - present,
        avg_late: lateDays > 0 ? Math.round(totalLateMin / lateDays) : 0,
        total_late_min: totalLateMin,
      }
    }))

    // ── F) ONLINE PAYMENTS ──
    const onlinePayments = await prisma.onlinePayment.findMany({
      where: { tenant_id: tenantId, created_at: { gte: new Date(currentYear, currentMonth - 1, 1) } },
      orderBy: { created_at: 'desc' },
      include: { tenant: false },
    })
    // Get subscriber names for online payments
    const subIds = [...new Set(onlinePayments.filter(p => p.subscriber_id).map(p => p.subscriber_id!))]
    const subNames = subIds.length > 0
      ? await prisma.subscriber.findMany({ where: { id: { in: subIds } }, select: { id: true, name: true } })
      : []
    const subNameMap = new Map(subNames.map(s => [s.id, s.name]))

    const onlineList = onlinePayments.map(p => ({
      id: p.id,
      date: p.created_at,
      subscriber_name: p.subscriber_id ? subNameMap.get(p.subscriber_id) ?? '—' : '—',
      amount: Number(p.amount),
      status: p.status,
      tran_ref: p.gateway_ref ?? '—',
    }))
    const totalOnlineSuccess = onlinePayments.filter(p => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0)
    const onlineSuccessRate = onlinePayments.length > 0
      ? Math.round((onlinePayments.filter(p => p.status === 'success').length / onlinePayments.length) * 100)
      : 0

    return NextResponse.json({
      financial: {
        monthly_revenue: monthlyRevenue,
        cash_this_month: Number(cashThisMonth._sum.amount_paid ?? 0),
        online_this_month: Number(onlineThisMonth._sum.amount ?? 0),
        total_debt: Number(totalDebtAgg._sum.total_debt ?? 0),
        collection_rate: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
      },
      subscribers: {
        total: totalActive, gold_count: goldCount, normal_count: normalCount,
        gold_amperage: Number(goldAmp._sum.amperage ?? 0),
        normal_amperage: Number(normalAmp._sum.amperage ?? 0),
        unpaid_count: unpaidList.length,
        unpaid_total: unpaidList.reduce((s, u) => s + Number(u.total_debt), 0),
        top_debtors: topDebtors.map(d => ({ name: d.name, debt: Number(d.total_debt) })),
      },
      collectors: collectorStats,
      expenses: {
        total: totalExpenses,
        by_category: expenseByCategory,
      },
      attendance: attendanceStats,
      online_payments: {
        list: onlineList,
        total_success: totalOnlineSuccess,
        success_rate: onlineSuccessRate,
      },
    })
  } catch (err: any) {
    console.error('[reports] Error:', err)
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
