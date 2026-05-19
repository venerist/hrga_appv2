'use client'
import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx-js-style'
import { attendanceService } from '@/services/attendance.service'
import { MetricCard, PageHeader, StatusBadge, EmptyState } from '@/components/ui'
import type { Absensi, AbsensiStatus, RawFingerprintRecord } from '@/types/attendance.types'
import { ABSENSI_STATUS_BADGE } from '@/types/attendance.types'
import { Upload, Download, Save, CheckCircle } from 'lucide-react'

type Tab = 'ringkasan' | 'terlambat' | 'tap1x' | 'absensi'

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('ringkasan')
  const [data, setData] = useState<Omit<Absensi, 'id' | 'created_at'>[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragover, setDragover] = useState(false)
  const [filterNama, setFilterNama] = useState('Semua')
  const [filterTgl, setFilterTgl] = useState('Semua')
  const [tap1Info, setTap1Info] = useState({ count: 0, pct: 0 })
  const [periode, setPeriode] = useState('')
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear())
  const [exportingFinal, setExportingFinal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setUploading(true); setSaved(false)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false }) as RawFingerprintRecord[]
      const processed = attendanceService.processFingerprint(raw)
      setData(processed)
      setTap1Info(attendanceService.calculateTap1xStats(processed))
      if (processed.length > 0) setPeriode(processed[0].periode)
    } finally { setUploading(false) }
  }, [])

  async function saveToSupabase() {
    setSaving(true)
    try { await attendanceService.saveToDatabase(data, periode); setSaved(true) }
    catch (e: any) { alert('Gagal simpan: ' + e.message) }
    finally { setSaving(false) }
  }

  async function downloadFinalReport() {
    setExportingFinal(true)
    try {
      const response = await fetch(`/api/export-attendance?month=${reportMonth}&year=${reportYear}`)
      if (!response.ok) {
        const errorJson = await response.json()
        throw new Error(errorJson?.error || 'Gagal mengunduh laporan')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `laporan-keterlambatan-${reportMonth}-${reportYear}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || 'Gagal mengunduh laporan')
    } finally {
      setExportingFinal(false)
    }
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new()

    const metaData = [
      ['PT VENERIS ENTERPRISE'],
      ['REPORT TITLE:', 'Laporan Absensi'],
      ['EXPORT TIMESTAMP:', new Date().toLocaleString()],
      ['PERIODE:', periode || 'Semua Waktu'],
      [],
      ['--- FILTER AKTIF ---'],
      ['Karyawan:', filterNama],
      ['Tanggal:', filterTgl],
      [],
      ['--- RINGKASAN DATA ---'],
      ['Total Karyawan Terfilter:', rekap.length],
      ['Total Baris Data:', df.length],
      ['Total Keterlambatan:', rekap.reduce((s, r) => s + r.terlambat, 0)],
      ['Total Menit Telat:', rekap.reduce((s, r) => s + r.total_mnt_telat, 0)]
    ]

    const wsMeta = XLSX.utils.aoa_to_sheet(metaData)
    if (wsMeta['A1']) wsMeta['A1'].s = { font: { bold: true, sz: 14 } }
    if (wsMeta['A2']) wsMeta['A2'].s = { font: { bold: true } }
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Summary')

    const wsRekap = XLSX.utils.json_to_sheet(rekap)
    wsRekap['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap_Terfilter')

    const wsDetail = XLSX.utils.json_to_sheet(df)
    wsDetail['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 8 },
      { wch: 15 },
      { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Harian')

    XLSX.writeFile(wb, `Laporan_Absensi_${periode || 'Filtered'}.xlsx`)
  }

  const namaList = ['Semua', ...Array.from(new Set(data.map(d => d.nama))).sort()]
  const tglList = ['Semua', ...Array.from(new Set(data.map(d => d.tanggal))).sort()]
  const df = data.filter(r => filterNama === 'Semua' || r.nama === filterNama).filter(r => filterTgl === 'Semua' || r.tanggal === filterTgl)
  const rekap = attendanceService.calculateRekap(df)
  const terlambatData = df.filter(r => r.status === 'Terlambat').sort((a, b) => b.menit_terlambat - a.menit_terlambat)
  const tap1Data = df.filter(r => r.status === 'Tap Masuk' || r.status === 'Tap Keluar')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'ringkasan', label: '📊 Ringkasan' },
    { key: 'terlambat', label: `⚠️ Terlambat (${terlambatData.length})` },
    { key: 'tap1x', label: `🟡 Tap 1x (${tap1Data.length})` },
    { key: 'absensi', label: '🚫 Ketidakhadiran' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon="📋" title="Attendance Management" subtitle="Upload absensi, monitoring kehadiran, rekap, dan export data." />

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-dark mb-4 flex items-center gap-2"><Upload size={16} /> Upload File Fingerprint</h3>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${dragover ? 'border-brand bg-brand-light scale-[1.01]' : 'border-border bg-surface hover:border-brand/50 hover:bg-brand-light/50'}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={e => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
        >
          {uploading
            ? <><span className="spinner" /><p className="mt-3 text-sm text-muted">Memproses file...</p></>
            : <>
              <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Upload size={24} className="text-brand" /></div>
              <p className="font-semibold text-dark text-sm">Drag & drop atau klik untuk pilih file</p>
              <p className="text-xs text-muted mt-1">Format: .xls atau .xlsx dari mesin fingerprint</p>
            </>
          }
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
        </div>

        {data.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                className="input-base !py-2 !text-sm"
                value={reportMonth}
                onChange={e => setReportMonth(Number(e.target.value))}
              >
                {[...Array(12)].map((_, index) => {
                  const value = index + 1
                  return <option key={value} value={value}>{`Bulan ${value}`}</option>
                })}
              </select>
              <select
                className="input-base !py-2 !text-sm"
                value={reportYear}
                onChange={e => setReportYear(Number(e.target.value))}
              >
                {[...Array(6)].map((_, index) => {
                  const value = new Date().getFullYear() - index
                  return <option key={value} value={value}>{value}</option>
                })}
              </select>
              <button onClick={downloadFinalReport} disabled={exportingFinal} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-dark hover:border-brand hover:text-brand transition-all cursor-pointer disabled:opacity-60">
                <Download size={15} /> {exportingFinal ? 'Mengunduh...' : 'Download Data'}
              </button>
            </div>
            <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm border border-emerald-100">
              <CheckCircle size={16} /> <strong>{data.length} record</strong> dari <strong>{new Set(data.map(d => d.nama)).size} karyawan</strong> diproses.
              {tap1Info.count > 0 && <span className="ml-2 text-amber-700">⚠️ {tap1Info.count} tap 1x ({tap1Info.pct}%)</span>}
            </div>
            <button onClick={downloadExcel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-dark hover:border-brand hover:text-brand transition-all cursor-pointer">
              <Download size={15} /> Excel
            </button>
            <button onClick={saveToSupabase} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-brand/15">
              {saving ? <span className="spinner" /> : saved ? <><CheckCircle size={15} /> Tersimpan</> : <><Save size={15} /> Simpan</>}
            </button>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <EmptyState icon="📋" message="Upload file fingerprint untuk mulai memproses data absensi" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark mb-1.5">👤 Filter Karyawan</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-card text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={filterNama} onChange={e => setFilterNama(e.target.value)}>
                {namaList.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1.5">📅 Filter Tanggal</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-border bg-card text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" value={filterTgl} onChange={e => setFilterTgl(e.target.value)}>
                {tglList.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-[0.8rem] font-semibold transition-all cursor-pointer ${tab === t.key ? 'bg-card text-brand shadow-sm' : 'text-muted hover:text-dark'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'ringkasan' && <RingkasanTab rekap={rekap} />}
          {tab === 'terlambat' && <TerlambatTab data={terlambatData} />}
          {tab === 'tap1x' && <Tap1xTab data={data} tap1Data={tap1Data} />}
          {tab === 'absensi' && <AbsensiTab data={data} df={df} />}
        </>
      )}
    </div>
  )
}

function RingkasanTab({ rekap }: { rekap: ReturnType<typeof attendanceService.calculateRekap> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Karyawan" value={rekap.length} icon="👥" />
        <MetricCard label="Avg Hadir" value={`${rekap.length ? Math.round(rekap.reduce((s, r) => s + r.pct_kehadiran, 0) / rekap.length) : 0}%`} icon="📈" />
        <MetricCard label="Terlambat" value={rekap.reduce((s, r) => s + r.terlambat, 0)} icon="⚠️" />
        <MetricCard label="Total Mnt" value={rekap.reduce((s, r) => s + r.total_mnt_telat, 0)} icon="⏱️" />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Dept</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Hadir</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Absen</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">%</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Telat</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Mnt</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tap1x</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Avg</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {rekap.map((r, i) => (
                <tr key={i} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3 text-muted text-xs">{r.departemen}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.hari_hadir}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-semibold ring-1 ring-inset ${r.tidak_hadir > 0 ? 'bg-red-50 text-red-700 ring-red-600/10' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'}`}>{r.tidak_hadir}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.pct_kehadiran}%</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-semibold ring-1 ring-inset ${r.terlambat > 0 ? 'bg-orange-50 text-orange-700 ring-orange-600/10' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'}`}>{r.terlambat}</span></td>
                  <td className={`px-4 py-3 font-mono text-xs ${r.total_mnt_telat > 0 ? 'text-err font-bold' : ''}`}>{r.total_mnt_telat}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-semibold ring-1 ring-inset ${r.tap_1x > 0 ? 'bg-amber-50 text-amber-700 ring-amber-600/10' : 'bg-gray-50 text-gray-500 ring-gray-400/10'}`}>{r.tap_1x}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.avg_jam || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TerlambatTab({ data }: { data: Omit<Absensi, 'id' | 'created_at'>[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Kejadian" value={data.length} icon="⚠️" />
        <MetricCard label="Total Menit" value={data.reduce((s, r) => s + r.menit_terlambat, 0)} icon="⏱️" />
        <MetricCard label="Karyawan" value={new Set(data.map(r => r.nama)).size} icon="👥" />
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">⏰ Toleransi: <strong>5 menit</strong> dari 08:00. Merah = &gt;30 mnt.</div>
      {data.length === 0 ? <EmptyState icon="🎉" message="Tidak ada keterlambatan!" /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Masuk</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Mnt Telat</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Durasi</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tanggal}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.jam_masuk_str}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[0.68rem] font-bold ring-1 ring-inset ${r.menit_terlambat > 30 ? 'bg-red-50 text-red-700 ring-red-600/10' : 'bg-orange-50 text-orange-700 ring-orange-600/10'}`}>{r.menit_terlambat} mnt</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.durasi_jam !== null ? `${r.durasi_jam} jam` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  )
}

function Tap1xTab({ data, tap1Data }: { data: Omit<Absensi, 'id' | 'created_at'>[]; tap1Data: Omit<Absensi, 'id' | 'created_at'>[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">🟡 <strong>Tap 1x</strong> = hanya tap sekali. Tetap <strong>hadir</strong>, perlu tindak lanjut.</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Kejadian" value={tap1Data.length} icon="🟡" />
        <MetricCard label="Karyawan" value={new Set(tap1Data.map(r => r.nama)).size} icon="👥" />
        <MetricCard label="% dari Total" value={`${data.length ? Math.round(tap1Data.length / data.length * 100) : 0}%`} icon="📊" />
      </div>
      {tap1Data.length === 0 ? <EmptyState icon="🎉" message="Tidak ada data tap 1x!" /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Dept</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Waktu</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {[...tap1Data].sort((a, b) => a.nama.localeCompare(b.nama)).map((r, i) => (
                <tr key={i} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3 text-muted text-xs">{r.departemen}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tanggal}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.jam_masuk_str}</td>
                  <td className="px-4 py-3"><StatusBadge label={r.status} config={ABSENSI_STATUS_BADGE[r.status as AbsensiStatus]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  )
}

function AbsensiTab({ data, df }: { data: Omit<Absensi, 'id' | 'created_at'>[]; df: Omit<Absensi, 'id' | 'created_at'>[] }) {
  const allTanggal = Array.from(new Set(data.map(d => d.tanggal))).sort()
  const allNama = Array.from(new Set(data.map(d => d.nama))).sort()
  const hadirSet = new Set(df.map(r => `${r.nama}__${r.tanggal}`))
  const records: { nama: string; tanggal: string }[] = []
  for (const nama of allNama) for (const tgl of allTanggal) if (!hadirSet.has(`${nama}__${tgl}`)) records.push({ nama, tanggal: tgl })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Ketidakhadiran" value={records.length} icon="🚫" />
        <MetricCard label="Karyawan Terdampak" value={new Set(records.map(r => r.nama)).size} icon="👥" />
        <MetricCard label="Hari Dipantau" value={allTanggal.length} icon="📆" />
      </div>
      {records.length === 0 ? <EmptyState icon="🎉" message="Semua karyawan hadir setiap hari!" /> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Tanggal</th>
              <th className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted uppercase tracking-wider">Keterangan</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {records.map((r, i) => (
                <tr key={i} className="hover:bg-surface/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-dark">{r.nama}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.tanggal}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">🚫 Tidak Hadir</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  )
}
