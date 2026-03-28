import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAccessCode, generatePrivacyCode } from '@/lib/access-code'

// Run once to migrate all existing subscribers to new code format
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  try {
    const branches = await prisma.branch.findMany({
      where: { tenant_id: user.tenantId, is_active: true },
    })

    let migrated = 0

    for (const branch of branches) {
      const subscribers = await prisma.subscriber.findMany({
        where: { branch_id: branch.id, is_active: true },
        orderBy: { created_at: 'asc' },
      })

      for (let i = 0; i < subscribers.length; i++) {
        const sub = subscribers[i]
        const existingCode = sub.access_code

        // Skip if already in new format (has dashes)
        if (existingCode && existingCode.includes('-')) continue

        const seq = i + 1
        let code = generateAccessCode(
          branch.province_key ?? 'baghdad',
          branch.district_key ?? '01',
          seq,
          generatePrivacyCode()
        )

        // Ensure uniqueness
        for (let attempt = 0; attempt < 10; attempt++) {
          const exists = await prisma.subscriber.findFirst({
            where: { access_code: code, id: { not: sub.id } },
          })
          if (!exists) break
          code = generateAccessCode(
            branch.province_key ?? 'baghdad',
            branch.district_key ?? '01',
            seq,
            generatePrivacyCode()
          )
        }

        await prisma.subscriber.update({
          where: { id: sub.id },
          data: { access_code: code },
        })
        migrated++
      }
    }

    return NextResponse.json({ ok: true, migrated })
  } catch (err: any) {
    console.error('[migrate-codes] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
