import { NextResponse } from 'next/server'

/**
 * Returns a 403 response if the user's role is not in the allowed list.
 * Returns null if access is granted.
 */
export function checkRole(userRole: string, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }
  return null
}
