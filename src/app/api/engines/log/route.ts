import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'owner' && user.role !== 'operator') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { engine_id, type, value, cost_iqd, notes } = body

    if (!engine_id || !type) {
      return NextResponse.json({ error: 'بيانات غير كافية' }, { status: 400 })
    }

    if (type === 'fuel') {
      // Add fuel log
      const fuelLog = await prisma.fuelLog.create({
        data: {
          engine_id,
          fuel_level_percent: 0, // Will be recalculated by IoT
          fuel_added_liters: value,
          source: 'manual',
          cost_iqd: cost_iqd || null,
          notes: notes || null,
        },
      })
      return NextResponse.json({ log: fuelLog }, { status: 201 })
    }

    if (type === 'hours') {
      // Add runtime hours
      const engine = await prisma.engine.update({
        where: { id: engine_id },
        data: {
          runtime_hours: { increment: value },
        },
      })
      return NextResponse.json({ engine }, { status: 201 })
    }

    if (type === 'manual_override') {
      // Activate manual override (max 4 hours)
      const { generator_id } = body
      if (!generator_id) {
        return NextResponse.json({ error: 'generator_id مطلوب' }, { status: 400 })
      }

      const maxHours = Math.min(value || 4, 4)
      const expires_at = new Date(Date.now() + maxHours * 60 * 60 * 1000)

      const override = await prisma.manualOverrideLog.create({
        data: {
          generator_id,
          activated_by: (session.user as any).id || session.user.name || 'unknown',
          expires_at,
          reason: notes || null,
        },
      })
      return NextResponse.json({ override }, { status: 201 })
    }

    return NextResponse.json({ error: 'نوع العملية غير صالح' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ' }, { status: 500 })
  }
}
