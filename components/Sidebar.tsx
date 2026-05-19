'use client'
import { useRouter, usePathname } from 'next/navigation'
import { AppLogo } from '@/components/ui'
import { LayoutDashboard, ClipboardList, BarChart3, DollarSign, Target, Star, Wrench, Settings, LogOut, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { canAccessRoute } from '@/app/auth/permissions'
import type { UserRole } from '@/app/auth/auth.types'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const NAV: NavItem[] = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/attendance', icon: ClipboardList,   label: 'Attendance Management' },
  { href: '/dashboard/cuti',       icon: Calendar,        label: 'Leave Management' },
  { href: '/dashboard/rekrutmen',  icon: Target,          label: 'Recruitment' },
  { href: '/dashboard/kpi',        icon: Star,            label: 'KPI' },
  { href: '/dashboard/ga',         icon: Wrench,          label: 'General Affairs' },
  { href: '/dashboard/settings',   icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<UserRole>('viewer') // default safe role

  useEffect(() => {
    // If they used the legacy local fallback:
    if (sessionStorage.getItem('hrga_logged_in') === 'true' && sessionStorage.getItem('hrga_user')) {
      setRole('admin') // Admin override for legacy
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then((response) => {
      const user = response.data.user;
      if (user) {
        setRole((user.user_metadata?.role as UserRole) || 'viewer')
      }
    })
  }, [])

  async function logout() {
    sessionStorage.clear()
    document.cookie = "hrga_legacy_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    const { useAttendanceStore } = await import('@/store/attendance.store')
    useAttendanceStore.getState().clearData()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 min-w-60 bg-sidebar fixed top-0 left-0 h-screen z-50 flex flex-col overflow-y-auto border-r border-white/[0.06]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <AppLogo variant="light" size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[0.65rem] font-semibold text-gray-500 uppercase tracking-widest">Menu</p>
        {NAV.map(item => {
          if (!canAccessRoute(role, item.href)) return null;

          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.82rem] font-medium transition-all duration-150
                ${active
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.82rem] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  )
}
