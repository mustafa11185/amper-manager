import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    db_url: process.env.DATABASE_URL ? 'set' : 'MISSING',
    nextauth_url: process.env.NEXTAUTH_URL || 'MISSING',
    node_env: process.env.NODE_ENV || 'unknown',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = 'connected'
  } catch (error: any) {
    checks.db = `error: ${error?.message || String(error)}`
    checks.status = 'error'
  }

  return NextResponse.json(checks, { status: checks.status === 'ok' ? 200 : 500 })
}
