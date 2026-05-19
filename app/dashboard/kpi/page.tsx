'use client'
import { useState, useEffect } from 'react'
import { kpiService } from '@/services/kpi.service'
import { MetricCard, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui'
import type { Kpi } from '@/types/kpi.types'
import { KPI_PREDIKAT_BADGE } from '@/types/kpi.types'
import { Plus, X, Trash2 } from 'lucide-react'
import { ExportExcelButton } from '@/components/ui/ExportExcelButton'

export default function KpiPage() {
  const [rows, setRows] = useState<Kpi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama: '', periode: '', target: 100, realisasi: 100, catatan: '' })

  async function load() { setLoading(true); try { setRows(await kpiService.getAll()) } catch (e) { console.error(e) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    try { setSaving(true); await kpiService.create(form); setShowForm(false); setForm({ nama: '', periode: '', target: 100, realisasi: 100, catatan: '' }); load() }
    catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }
  async function hapus(id: string) { if (!confirm('Hapus data KPI ini?')) return; await kpiService.delete(id); load() }

  const stats = kpiService.getStats(rows)
  const previewCapaian = kpiService.calculateCapaian(form.target, form.realisasi)
  const previewPredikat = kpiService.getPredikat(previewCapaian)

  return (
    <div className="space-y-6">
      <PageHeader icon="⭐" title="Penilaian KPI" subtitle="Evaluasi kinerja karyawan berdasarkan target & realisasi"
        action={
          <div className="flex items-center gap-2">
            <ExportExcelButton data={rows} filename="Laporan_KPI_Karyawan" sheetName="KPI" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur" />
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold backdrop-blur transition-all cursor-pointer">{showForm ? <><X size={15} /> Tutup</> : <><Plus size={15} /> Input KPI</>}</button>
          </div>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Penilaian" value={stats.total} icon="📋" />
        <MetricCard label="Avg Capaian" value={`${stats.avgCapaian}%`} icon="📈" />
        <MetricCard label="Excellent" value={stats.excellent} icon="🟢" />
        <MetricCard label="Need Improvement" value={stats.needImprovement} icon="🔴" />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-dark">➕ Input Penilaian KPI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Nama *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Periode *</label><input className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" placeholder="Maret 2026" value={form.periode} onChange={e => setForm({ ...form, periode: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Target (%)</label><input type="number" min={0} max={100} className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.target} onChange={e => setForm({ ...form, target: +e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-dark mb-1.5">Realisasi (%)</label><input type="number" min={0} max={200} className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={form.realisasi} onChange={e => setForm({ ...form, realisasi: +e.target.value })} /></div>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border text-sm">
            Preview: Capaian = <strong>{Math.round(previewCapaian)}%</strong> → {previewPredikat === 'Excellent' ? '🟢 Excellent' : previewPredikat === 'Good' ? '🟡 Good' : '🔴 Need Improvement'}
          </div>
          <div><label className="block text-xs font-semibold text-dark mb-1.5">Catatan</label><textarea className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-y min-h-20" value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} /></div>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-brand/15">{saving ? <span className="spinner" /> : '💾 Simpan KPI'}</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState icon="⭐" message="Belum ada data KPI." /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Periode</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Target</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Realisasi</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Capaian</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Predikat</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Catatan</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/10">{r.periode}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.target}%</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.realisasi}%</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{r.capaian}%</td>
                  <td className="px-4 py-3"><StatusBadge label={r.predikat} config={KPI_PREDIKAT_BADGE[r.predikat]} /></td>
                  <td className="px-4 py-3 text-muted text-xs">{r.catatan || '-'}</td>
                  <td className="px-4 py-3"><button onClick={() => hapus(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  )
}
