import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') {
    return NextResponse.json({ error: 'غير مصرح — المالك فقط' }, { status: 403 })
  }

  try {
    const { from_staff_id, amount, notes } = await req.json()

    if (!from_staff_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the staff wallet
      const wallet = await tx.collectorWallet.findUnique({
        where: { staff_id: from_staff_id },
      })
      if (!wallet) throw new Error('محفظة الجابي غير موجودة')

      // Update wallet
      await tx.collectorWallet.update({
        where: { staff_id: from_staff_id },
        data: {
          total_delivered: { increment: amount },
          balance: { decrement: amount },
          last_updated: new Date(),
        },
      })

      // Create delivery record
      const delivery = await tx.deliveryRecord.create({
        data: {
          branch_id: wallet.branch_id,
          from_staff_id,
          received_by_owner: user.role === 'owner',
          tenant_id: wallet.tenant_id,
          amount,
          payment_type: 'cash',
          notes: notes || null,
          is_confirmed: true,
          confirmed_at: new Date(),
          confirmed_by: user.id || user.name,
        },
      })

      // Get collector name for notification
      const staffRecord = await tx.staff.findUnique({ where: { id: from_staff_id }, select: { name: true } })
      const collectorName = staffRecord?.name || 'الجابي'

      // Create delivery notification
      await tx.notification.create({
        data: {
          branch_id: wallet.branch_id,
          tenant_id: wallet.tenant_id,
          type: 'delivery',
          title: 'تسليم نقدي',
          body: `سلّم ${collectorName} مبلغ ${amount.toLocaleString()} د.ع`,
        },
      })

      return delivery
    })

    return NextResponse.json({ delivery: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
