'use client'
import { useState, useEffect } from 'react'
import { gaService } from '@/services/ga.service'
import { MetricCard, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui'
import type { Ga, GaStatus } from '@/types/ga.types'
import { GA_KATEGORI_OPTIONS, GA_PRIORITAS_OPTIONS, GA_STATUS_OPTIONS, GA_PRIORITAS_BADGE, GA_STATUS_BADGE } from '@/types/ga.types'
import { Plus, X, Trash2 } from 'lucide-react'
import { ExportExcelButton } from '@/components/ui/ExportExcelButton'

export default function GaPage() {
  const [rows, setRows] = useState<Ga[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ pemohon: '', kategori: 'Alat Tulis Kantor', deskripsi: '', prioritas: 'Normal', tanggal: '' })

  async function load() { setLoading(true); try { setRows(await gaService.getAll()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    try { setSaving(true); await gaService.create(form); setShowForm(false); setForm({ pemohon: '', kategori: 'Alat Tulis Kantor', deskripsi: '', prioritas: 'Normal', tanggal: '' }); load() }
    catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }
  async function updateStatus(id: string, status: string) { await gaService.updateStatus(id, status as GaStatus); load() }
  async function hapus(id: string) { if (!confirm('Hapus tiket ini?')) return; await gaService.delete(id); load() }

  const stats = gaService.getStats(rows)

  return (
    <div className="space-y-6">
      <PageHeader icon="🔧" title="General Affairs" subtitle="Log permintaan & pemeliharaan aset kantor"
        action={
          <div className="flex items-center gap-2">
            <ExportExcelButton data={rows} filename="Laporan_Tiket_GA" sheetName="General Affairs" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur" />
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold backdrop-blur transition-all cursor-pointer">{showForm ? <><X size={15} /> Tutup</> : <><Plus size={15} /> Buat Tiket</>}</button>
          </div>
        } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Tiket" value={stats.total} icon="🎫" />
        <MetricCard label="Open" value={stats.open} icon="🔄" />
        <MetricCard label="Urgent/Critical" value={stats.urgentCritical} icon="🚨" />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-dark">➕ Tiket Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Pemohon *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.pemohon} onChange={e => setForm({ ...form, pemohon: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Kategori</label><select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>{GA_KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Prioritas</label><select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.prioritas} onChange={e => setForm({ ...form, prioritas: e.target.value })}>{GA_PRIORITAS_OPTIONS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Tanggal</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-dark mb-1.5">Deskripsi *</label><textarea className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-y min-h-20" value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} /></div>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-brand/15">{saving ? <span className="spinner" /> : '💾 Buat Tiket'}</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState icon="🔧" message="Belum ada tiket GA." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Pemohon</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Kategori</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Deskripsi</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Prioritas</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.pemohon}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/10">{r.kategori}</span></td>
                  <td className="px-4 py-3 text-muted text-xs max-w-60 truncate">{r.deskripsi}</td>
                  <td className="px-4 py-3"><StatusBadge label={r.prioritas} config={GA_PRIORITAS_BADGE[r.prioritas]} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tanggal || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge label={r.status} config={GA_STATUS_BADGE[r.status]} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select className="px-2 py-1 rounded-lg border border-border bg-white text-xs outline-none focus:border-brand transition-all" value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>{GA_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
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
