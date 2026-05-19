'use client'
import { useState, useEffect } from 'react'
import { recruitmentService } from '@/services/recruitment.service'
import { MetricCard, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui'
import type { Rekrutmen, RekrutmenStatus } from '@/types/recruitment.types'
import { REKRUTMEN_STATUS_OPTIONS, REKRUTMEN_STATUS_BADGE } from '@/types/recruitment.types'
import { Plus, X, Trash2 } from 'lucide-react'
import { ExportExcelButton } from '@/components/ui/ExportExcelButton'

export default function RekrutmenPage() {
  const [rows, setRows] = useState<Rekrutmen[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama: '', posisi: '', tgl_melamar: '', status: 'Screening', catatan: '' })

  async function load() { setLoading(true); try { setRows(await recruitmentService.getAll()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    try { setSaving(true); await recruitmentService.create(form); setShowForm(false); setForm({ nama: '', posisi: '', tgl_melamar: '', status: 'Screening', catatan: '' }); load() }
    catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }
  async function updateStatus(id: string, status: string) { await recruitmentService.updateStatus(id, status as RekrutmenStatus); load() }
  async function hapus(id: string) { if (!confirm('Hapus kandidat ini?')) return; await recruitmentService.delete(id); load() }

  const stats = recruitmentService.getStats(rows)

  return (
    <div className="space-y-6">
      <PageHeader icon="🎯" title="Rekrutmen" subtitle="Pipeline kandidat & status seleksi"
        action={
          <div className="flex items-center gap-2">
            <ExportExcelButton data={rows} filename="Laporan_Rekrutmen_Kandidat" sheetName="Rekrutmen" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur" />
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold backdrop-blur transition-all cursor-pointer">{showForm ? <><X size={15} /> Tutup</> : <><Plus size={15} /> Tambah</>}</button>
          </div>
        } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Kandidat" value={stats.total} icon="👥" />
        <MetricCard label="Proses Aktif" value={stats.aktif} icon="🔄" />
        <MetricCard label="Diterima" value={stats.diterima} icon="✅" />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-dark">➕ Kandidat Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Nama Kandidat *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Posisi *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.posisi} onChange={e => setForm({ ...form, posisi: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Tgl Melamar</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.tgl_melamar} onChange={e => setForm({ ...form, tgl_melamar: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Status</label><select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{REKRUTMEN_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-semibold text-dark mb-1.5">Catatan</label><textarea className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-y min-h-20" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} /></div>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-brand/15">{saving ? <span className="spinner" /> : '💾 Simpan'}</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState icon="🎯" message="Belum ada kandidat." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Posisi</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tgl</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Catatan</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3 text-dark">{r.posisi}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tgl_melamar || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge label={r.status} config={REKRUTMEN_STATUS_BADGE[r.status]} /></td>
                  <td className="px-4 py-3 text-muted text-xs max-w-48 truncate">{r.catatan || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select className="px-2 py-1 rounded-lg border border-border bg-white text-xs outline-none focus:border-brand transition-all" value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>{REKRUTMEN_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
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
