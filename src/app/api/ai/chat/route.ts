import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = (session.user as any).plan
  if (plan === 'basic') {
    return NextResponse.json({ error: 'متاح في باقة Gold+' }, { status: 403 })
  }

  try {
    const { message } = await req.json()

    // Placeholder — will integrate with AI service
    return NextResponse.json({
      reply: 'مرحباً! هذه الميزة قيد التطوير. ستتمكن قريباً من الحصول على تحليلات ذكية لمولدك.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
