import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    tenantId: string
    branchId?: string
    plan?: string
    canCollect?: boolean
    isOwnerActing?: boolean
    phone?: string
  }

  interface Session {
    user: {
      id: string
      name: string
      role: string
      tenantId: string
      branchId?: string
      plan?: string
      canCollect?: boolean
      isOwnerActing?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    tenantId: string
    branchId?: string
    plan?: string
    canCollect?: boolean
    isOwnerActing?: boolean
  }
}
