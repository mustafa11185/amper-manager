export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png).*)']
}
