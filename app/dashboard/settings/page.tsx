'use client'
import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/ui'
import { Shield, Check, X, Users, ChevronRight, Save, GripVertical } from 'lucide-react'

const initialRoles = ['Super Admin', 'HR Director', 'HR Manager', 'HR Staff', 'Payroll Staff', 'Supervisor', 'Employee']
const modules = ['Dashboard', 'Rekrutmen', 'Cuti & Izin', 'KPI', 'General Affairs', 'Employees', 'Settings']

const initialMatrix: Record<string, boolean[]> = {
  'Super Admin':   [true, true, true, true, true, true, true],
  'HR Director':   [true, true, true, true, true, true, false],
  'HR Manager':    [true, true, true, true, true, true, false],
  'HR Staff':      [true, true, true, true, false, true, false],
  'Payroll Staff': [true, false, false, false, false, true, false],
  'Supervisor':    [true, false, true, true, false, false, false],
  'Employee':      [true, false, true, false, false, false, false],
}

const roleColors: Record<string, string> = {
  'Super Admin': 'from-primary to-primary-dark',
  'HR Director': 'from-secondary to-secondary-dark',
  'HR Manager': 'from-indigo-500 to-indigo-700',
  'HR Staff': 'from-accent to-accent-dark',
  'Payroll Staff': 'from-emerald-500 to-emerald-700',
  'Supervisor': 'from-purple-500 to-purple-700',
  'Employee': 'from-amber-500 to-amber-700',
}

export default function SettingsPage() {
  const [roles, setRoles] = useState<string[]>(initialRoles)
  const [matrix, setMatrix] = useState<Record<string, boolean[]>>(initialMatrix)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [notification, setNotification] = useState('')

  // Drag and drop state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    // Load from local storage if previously saved
    const savedRoles = localStorage.getItem('veneris_roles')
    const savedMatrix = localStorage.getItem('veneris_matrix')
    if (savedRoles) setRoles(JSON.parse(savedRoles))
    if (savedMatrix) setMatrix(JSON.parse(savedMatrix))
  }, [])

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const _roles = [...roles]
      const draggedItemContent = _roles.splice(dragItem.current, 1)[0]
      _roles.splice(dragOverItem.current, 0, draggedItemContent)
      dragItem.current = null
      dragOverItem.current = null
      setRoles(_roles)
    }
  }

  const togglePermission = (role: string, moduleIndex: number) => {
    const newMatrix = { ...matrix }
    newMatrix[role][moduleIndex] = !newMatrix[role][moduleIndex]
    setMatrix(newMatrix)
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      localStorage.setItem('veneris_roles', JSON.stringify(roles))
      localStorage.setItem('veneris_matrix', JSON.stringify(matrix))
      setSaving(false)
      setShowConfirm(false)
      setNotification('Konfigurasi role hierarchy dan permission berhasil disimpan!')
      setTimeout(() => setNotification(''), 3000)
    }, 800)
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <PageHeader
        icon={<Shield size={24} />}
        title="Pengaturan & RBAC"
        subtitle="Role-Based Access Control — editable permission matrix & hierarchy"
        gradient="indigo"
        action={
          <button onClick={() => setShowConfirm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all cursor-pointer shadow-md shadow-primary/20">
            <Save size={15} /> Simpan Konfigurasi
          </button>
        }
      />

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
          <Check size={16} /> {notification}
        </div>
      )}

      {/* Role Hierarchy */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-dark mb-1">Role Hierarchy (Drag & Drop)</h3>
        <p className="text-xs text-muted mb-6">Geser item di bawah untuk mengatur urutan hierarki akses.</p>
        <div className="flex flex-col gap-3">
          {roles.map((role, i) => (
            <div
              key={role}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:bg-surface-alt transition-colors cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={16} className="text-muted" />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[role] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                {role[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-dark">{role}</p>
                <p className="text-[0.65rem] text-muted">Hierarki Level {i + 1} • Akses {matrix[role]?.filter(Boolean).length || 0} modul</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-dark">Editable Permission Matrix</h3>
            <p className="text-[0.65rem] text-muted">Klik pada icon untuk mengubah hak akses modul bagi tiap role.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50">
                <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider sticky left-0 bg-surface-alt/50 z-10">Modul</th>
                {roles.map(role => (
                  <th key={role} className="px-4 py-3 text-center text-[0.68rem] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {modules.map((mod, mi) => (
                <tr key={mod} className="hover:bg-surface-alt/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark text-xs sticky left-0 bg-card z-10">{mod}</td>
                  {roles.map(role => (
                    <td key={role} className="px-4 py-3 text-center">
                      <button 
                        onClick={() => togglePermission(role, mi)}
                        className={`inline-flex w-7 h-7 rounded-lg items-center justify-center transition-all cursor-pointer ${
                          matrix[role]?.[mi] ? 'bg-secondary/15 hover:bg-secondary/30' : 'bg-red-50 hover:bg-red-100'
                        }`}
                      >
                        {matrix[role]?.[mi] ? (
                          <Check size={14} className="text-secondary" />
                        ) : (
                          <X size={14} className="text-red-400" />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Architecture Summary */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-dark mb-4">System Security Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ArchCard title="Authentication" items={['Supabase SSR Auth', 'HTTP-only Cookies', 'Session Refresh', 'Legacy Fallback']} color="primary" />
          <ArchCard title="Authorization" items={['Middleware RBAC', 'Route Protection', 'Role Hierarchy', 'Permission Matrix']} color="secondary" />
          <ArchCard title="Data Security" items={['PostgreSQL RLS', 'Row-level Policies', 'Service Role Key', 'Audit Logging']} color="accent" />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={() => !saving && setShowConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm animate-scale-in">
            <div className="glass-card rounded-2xl p-6 shadow-elevated mx-4 text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-dark mb-2">Simpan Konfigurasi?</h3>
              <p className="text-sm text-muted mb-6">Perubahan pada hierarchy dan permission akan diterapkan ke seluruh sistem HRIS.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-dark hover:bg-surface-alt transition-colors cursor-pointer">Batal</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-60 flex justify-center">
                  {saving ? <span className="spinner w-5 h-5 border-2" /> : 'Ya, Simpan'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ArchCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colors: Record<string, string> = {
    primary: 'border-primary/20 bg-primary-50/30',
    secondary: 'border-secondary/20 bg-secondary-50/30',
    accent: 'border-accent/20 bg-accent-50/30',
  }
  const dotColor: Record<string, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
  }
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <h4 className="text-xs font-bold text-dark mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-center gap-2 text-xs text-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor[color]} shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
