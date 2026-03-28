'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Home,
  Users,
  CreditCard,
  Zap,
  Settings,
  BarChart3,
  ClipboardList,
  CheckCircle,
  Fuel,
  FileText,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Tab = {
  label: string
  href: string
  icon: LucideIcon
  elevated?: boolean
}

function getTabsForRole(role: string, canCollect?: boolean): Tab[] {
  switch (role) {
    case 'owner':
      return [
        { label: 'الرئيسية', href: '/dashboard', icon: Home },
        { label: 'المشتركون', href: '/subscribers', icon: Users },
        { label: 'الدفع', href: '/pos', icon: CreditCard, elevated: true },
        { label: 'التقارير', href: '/reports', icon: BarChart3 },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
    case 'collector':
      return [
        { label: 'الرئيسية', href: '/dashboard', icon: Home },
        { label: 'المشتركون', href: '/subscribers', icon: Users },
        { label: 'الدفع', href: '/pos', icon: CreditCard, elevated: true },
        { label: 'تقريري', href: '/my-report', icon: BarChart3 },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
    case 'cashier':
      return [
        { label: 'الرئيسية', href: '/dashboard', icon: Home },
        { label: 'الدفع', href: '/pos', icon: CreditCard, elevated: true },
        { label: 'المحفظة', href: '/wallet', icon: Wallet },
        { label: 'اليوم', href: '/my-report', icon: BarChart3 },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
    case 'accountant':
      if (canCollect) {
        return [
          { label: 'الرئيسية', href: '/dashboard', icon: Home },
          { label: 'المشتركون', href: '/subscribers', icon: Users },
          { label: 'الدفع', href: '/pos', icon: CreditCard, elevated: true },
          { label: 'التقارير', href: '/reports', icon: BarChart3 },
          { label: 'الإعدادات', href: '/settings', icon: Settings },
        ]
      }
      return [
        { label: 'الرئيسية', href: '/dashboard', icon: Home },
        { label: 'المشتركون', href: '/subscribers', icon: Users },
        { label: 'التقارير', href: '/reports', icon: BarChart3 },
        { label: 'الفواتير', href: '/invoices', icon: FileText },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
    case 'operator':
      return [
        { label: 'الدوام', href: '/attendance', icon: CheckCircle },
        { label: 'المحركات', href: '/op-engines', icon: Zap },
        { label: 'الوقود', href: '/fuel', icon: Fuel },
        { label: 'سجلاتي', href: '/op-logs', icon: ClipboardList },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
    default:
      return [
        { label: 'الرئيسية', href: '/dashboard', icon: Home },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
      ]
  }
}

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session?.user) return null

  const tabs = getTabsForRole(session.user.role, session.user.canCollect)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border">
      <div className="mx-auto max-w-[390px] flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (pathname?.startsWith(tab.href + '/') ?? false)
          const Icon = tab.icon

          if (tab.elevated) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center -mt-5"
              >
                <div
                  className={`w-[44px] h-[44px] rounded-full flex items-center justify-center shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-primary to-violet'
                      : 'bg-blue-primary'
                  }`}
                  style={{ boxShadow: '0 4px 20px rgba(27,79,216,0.35)' }}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-[10px] mt-1 font-medium text-blue-primary">
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center pt-2 pb-1 min-w-[56px] ${
                isActive ? 'text-blue-primary' : 'text-text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
