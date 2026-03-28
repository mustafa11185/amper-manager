import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { regeneratePrivacy, generateAccessCode, generatePrivacyCode } from '@/lib/access-code'

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'المالك فقط' }, { status: 403 })

  const { id } = await params

  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
    include: { branch: true },
  })
  if (!subscriber) return NextResponse.json({ error: 'المشترك غير موجود' }, { status: 404 })

  let newCode: string

  if (subscriber.access_code && subscriber.access_code.includes('-')) {
    // Existing new-format code — only regenerate privacy (last 3 digits)
    newCode = regeneratePrivacy(subscriber.access_code)
  } else {
    // Old format or no code — generate full new code
    const seq = await prisma.subscriber.count({ where: { branch_id: subscriber.branch_id } })
    newCode = generateAccessCode(
      subscriber.branch.province_key ?? 'baghdad',
      subscriber.branch.district_key ?? '01',
      seq,
      generatePrivacyCode()
    )
  }

  // Ensure uniqueness
  for (let attempt = 0; attempt < 10; attempt++) {
    const exists = await prisma.subscriber.findFirst({
      where: { access_code: newCode, id: { not: id } },
    })
    if (!exists) break
    newCode = subscriber.access_code?.includes('-')
      ? regeneratePrivacy(subscriber.access_code)
      : generateAccessCode(
          subscriber.branch.province_key ?? 'baghdad',
          subscriber.branch.district_key ?? '01',
          1, generatePrivacyCode()
        )
  }

  await prisma.subscriber.update({
    where: { id },
    data: { access_code: newCode },
  })

  return NextResponse.json({ ok: true, access_code: newCode })
}
