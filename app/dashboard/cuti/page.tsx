'use client'
import { useState, useEffect } from 'react'
import { leaveService } from '@/services/leave.service'
import { MetricCard, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui'
import type { Cuti, CutiStatus } from '@/types/leave.types'
import { CUTI_JENIS_OPTIONS, CUTI_STATUS_OPTIONS, CUTI_JENIS_BADGE, CUTI_STATUS_BADGE } from '@/types/leave.types'
import { Plus, X, Trash2 } from 'lucide-react'
import { ExportExcelButton } from '@/components/ui/ExportExcelButton'

export default function CutiPage() {
  const [rows, setRows] = useState<Cuti[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama: '', jenis: 'CUTI REGULER', tgl_mulai: '', tgl_selesai: '', alasan: '' })

  async function load() { 
    setLoading(true); 
    try { 
      const data = await leaveService.getAll();
      setRows(data);
    } catch (e: any) { 
      console.error('Failed to load leave requests:', e);
      alert('Gagal memuat data cuti: ' + (e.message || 'Error tidak diketahui'));
    } finally { 
      setLoading(false); 
    } 
  }
  useEffect(() => { load() }, [])

  async function save() {
    try { setSaving(true); await leaveService.create(form); setShowForm(false); setForm({ nama: '', jenis: 'CUTI REGULER', tgl_mulai: '', tgl_selesai: '', alasan: '' }); load() }
    catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }
  async function updateStatus(id: string, status: string) { await leaveService.updateStatus(id, status as CutiStatus); load() }
  async function hapus(id: string) { if (!confirm('Hapus data cuti ini?')) return; await leaveService.delete(id); load() }

  const stats = leaveService.getStats(rows)

  return (
    <div className="space-y-6">
      <PageHeader icon="📅" title="Cuti & Izin" subtitle="Manajemen pengajuan cuti karyawan"
        action={
          <div className="flex items-center gap-2">
            <ExportExcelButton data={rows} filename="Laporan_Cuti_Karyawan" sheetName="Cuti" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur" />
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold backdrop-blur transition-all cursor-pointer">{showForm ? <><X size={15} /> Tutup</> : <><Plus size={15} /> Ajukan</>}</button>
          </div>
        } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Pengajuan" value={stats.total} icon="📋" />
        <MetricCard label="Total Hari" value={stats.totalHari} icon="📆" />
        <MetricCard label="Pending" value={stats.pending} icon="⏳" />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-dark">➕ Form Pengajuan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Nama *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Jenis</label><select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })}>{CUTI_JENIS_OPTIONS.map(j => <option key={j}>{j}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Mulai *</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.tgl_mulai} onChange={e => setForm({ ...form, tgl_mulai: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Selesai *</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.tgl_selesai} onChange={e => setForm({ ...form, tgl_selesai: e.target.value })} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-dark mb-1.5">Alasan</label><textarea className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-y min-h-20" value={form.alasan} onChange={e => setForm({ ...form, alasan: e.target.value })} /></div>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-brand/15">{saving ? <span className="spinner" /> : '💾 Simpan'}</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState icon="📅" message="Belum ada pengajuan cuti." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Jenis</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Mulai</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Selesai</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Durasi</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3"><StatusBadge label={r.jenis} config={CUTI_JENIS_BADGE[r.jenis]} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tgl_mulai}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tgl_selesai}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{r.durasi_hari} hari</td>
                  <td className="px-4 py-3"><StatusBadge label={r.status} config={CUTI_STATUS_BADGE[r.status]} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select className="px-2 py-1 rounded-lg border border-border bg-white text-xs outline-none focus:border-brand transition-all" value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>{CUTI_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
                      <button onClick={() => hapus(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  )
}
