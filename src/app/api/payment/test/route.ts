import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPayment } from '@/lib/payment-service'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any

  try {
    const branch = await prisma.branch.findFirst({
      where: { tenant_id: user.tenantId, is_active: true },
    })
    if (!branch) return NextResponse.json({ error: 'لا يوجد فرع' }, { status: 404 })
    if (branch.active_gateway === 'none') {
      return NextResponse.json({ error: 'لم يتم تفعيل بوابة دفع' }, { status: 400 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002'
    const testId = `TEST-${Date.now()}`

    const result = await createPayment(branch as any, {
      invoice_id: testId,
      subscriber_id: 'test',
      subscriber_name: 'اختبار الدفع',
      subscriber_phone: '',
      amount: 1000,
      billing_month: new Date().getMonth() + 1,
      return_url: `${baseUrl}/payment/success?test=true`,
      callback_url: `${baseUrl}/api/payment/${branch.active_gateway === 'aps' ? 'aps-callback' : 'furatpay-callback'}`,
    })

    return NextResponse.json({ payment_url: result.payment_url, gateway: result.gateway })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
