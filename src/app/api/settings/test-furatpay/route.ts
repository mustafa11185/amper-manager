import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// FuratPay API endpoints may need adjustment based on official documentation
// Sandbox: https://sandbox.furatpay.com (verify with FuratPay team)
// Production: https://api.furatpay.com (verify with FuratPay team)
// Contact: support@furatpay.com for API docs and merchant credentials

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const branch = await prisma.branch.findFirst({
    where: { tenant_id: user.tenantId, is_active: true },
    select: { furatpay_merchant_id: true, furatpay_api_key: true, furatpay_is_sandbox: true },
  })

  if (!branch?.furatpay_merchant_id || !branch?.furatpay_api_key) {
    return NextResponse.json({ ok: false, error: 'أدخل بيانات FuratPay أولاً' }, { status: 400 })
  }

  try {
    const baseUrl = branch.furatpay_is_sandbox
      ? 'https://sandbox.furatpay.com'
      : 'https://api.furatpay.com'

    const res = await fetch(`${baseUrl}/api/v1/merchant/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${branch.furatpay_api_key}`,
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, error: 'بيانات الاعتماد غير صحيحة' })
    }

    return NextResponse.json({ ok: true, message: 'الاتصال ناجح ✅' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'فشل الاتصال بـ FuratPay' }, { status: 500 })
  }
}
