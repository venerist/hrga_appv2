import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx-js-style'

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// Style presets
const STYLES = {
  title: {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subtitle: {
    font: { italic: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2D5F8A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  header: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '34495E' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  },
  cell: {
    font: { sz: 10 },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
      left: { style: 'thin', color: { rgb: 'D0D0D0' } },
      right: { style: 'thin', color: { rgb: 'D0D0D0' } },
    },
  },
  cellCenter: {
    font: { sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
      left: { style: 'thin', color: { rgb: 'D0D0D0' } },
      right: { style: 'thin', color: { rgb: 'D0D0D0' } },
    },
  },
  cellAlt: {
    font: { sz: 10 },
    alignment: { vertical: 'center' },
    fill: { fgColor: { rgb: 'F7F9FC' } },
    border: {
      top: { style: 'thin', color: { rgb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
      left: { style: 'thin', color: { rgb: 'D0D0D0' } },
      right: { style: 'thin', color: { rgb: 'D0D0D0' } },
    },
  },
  cellAltCenter: {
    font: { sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F7F9FC' } },
    border: {
      top: { style: 'thin', color: { rgb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
      left: { style: 'thin', color: { rgb: 'D0D0D0' } },
      right: { style: 'thin', color: { rgb: 'D0D0D0' } },
    },
  },
  warning: {
    font: { bold: true, sz: 10, color: { rgb: 'C0392B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FDEDEC' } },
    border: {
      top: { style: 'thin', color: { rgb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
      left: { style: 'thin', color: { rgb: 'D0D0D0' } },
      right: { style: 'thin', color: { rgb: 'D0D0D0' } },
    },
  },
} as const

function formatTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDayName(value: string): string {
  const date = new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', { weekday: 'long' })
}

function formatDateId(value: string): string {
  const date = new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function applyStylesToRange(ws: XLSX.WorkSheet, startRow: number, endRow: number, numCols: number, centerCols: number[] = []) {
  for (let r = startRow; r <= endRow; r++) {
    const isAlt = (r - startRow) % 2 === 1
    for (let c = 0; c < numCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { v: '', t: 's' }
      const isCenter = centerCols.includes(c)
      if (isAlt) {
        ws[addr].s = isCenter ? STYLES.cellAltCenter : STYLES.cellAlt
      } else {
        ws[addr].s = isCenter ? STYLES.cellCenter : STYLES.cell
      }
    }
  }
}

function getProp(obj: any, keys: string[]): any {
  if (!obj) return null
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
    const ku = k.toUpperCase()
    if (obj[ku] !== undefined && obj[ku] !== null) return obj[ku]
    const kl = k.toLowerCase()
    if (obj[kl] !== undefined && obj[kl] !== null) return obj[kl]
    const kU = k.replace(/\s+/g, '_')
    if (obj[kU] !== undefined && obj[kU] !== null) return obj[kU]
    if (obj[kU.toUpperCase()] !== undefined && obj[kU.toUpperCase()] !== null) return obj[kU.toUpperCase()]
    if (obj[kU.toLowerCase()] !== undefined && obj[kU.toLowerCase()] !== null) return obj[kU.toLowerCase()]
    const kS = k.replace(/_+/g, ' ')
    if (obj[kS] !== undefined && obj[kS] !== null) return obj[kS]
    if (obj[kS.toUpperCase()] !== undefined && obj[kS.toUpperCase()] !== null) return obj[kS.toUpperCase()]
    if (obj[kS.toLowerCase()] !== undefined && obj[kS.toLowerCase()] !== null) return obj[kS.toLowerCase()]
  }
  return null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const month = Number(url.searchParams.get('month'))
    const year = Number(url.searchParams.get('year'))

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month and year query parameters are required and must be valid.' }, { status: 400 })
    }

    const lastDay = new Date(year, month, 0).getDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const supabase = await createAdminClient()

    // Try attendance_date first, fallback to date
    let summaries: any[] = []
    let summaryError: any = null

    const { data: d1, error: e1 } = await supabase
      .from('attendance_summary')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true })

    if (e1) {
      // Fallback: try "date" column
      const { data: d2, error: e2 } = await supabase
        .from('attendance_summary')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (e2) {
        summaryError = e2
      } else {
        summaries = (d2 || []).map((r: any) => ({ ...r, attendance_date: r.date }))
      }
    } else {
      summaries = d1 || []
    }

    if (summaryError) throw summaryError

    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('*')

    if (employeeError) throw employeeError

    const employeeNames = Object.fromEntries((employees || []).map((emp: any) => {
      const nik = getProp(emp, ['nik', 'employee_nik', 'id', 'no'])
      const name = getProp(emp, ['name', 'nama', 'NAMA', 'NAME']) || nik
      return [nik, name]
    }))

    const reportMonth = MONTH_NAMES_ID[month - 1] ?? `${month}`
    const title = `LAPORAN KEHADIRAN & KETERLAMBATAN KARYAWAN — ${reportMonth.toUpperCase()} ${year}`
    const subtitle = 'Jam Kerja: 08.00 – 16.00 WIB | Veneris HRIS'

    // ============ SHEET 1: Ringkasan Keterlambatan ============
    const summaryByEmployee: Record<string, { nama: string; count: number; totalLate: number }> = {}
    const detailRows: any[] = []

    for (const row of summaries) {
      const nik = row.employee_nik
      const nama = employeeNames[nik] ?? nik
      const lateMinutes = row.late_minutes ?? 0
      const dateStr = row.attendance_date || row.date

      if (!summaryByEmployee[nik]) {
        summaryByEmployee[nik] = { nama, count: 0, totalLate: 0 }
      }

      if (lateMinutes > 0) {
        summaryByEmployee[nik].count += 1
        summaryByEmployee[nik].totalLate += lateMinutes
      }

      detailRows.push({
        nama,
        tanggal: formatDateId(dateStr),
        hari: formatDayName(dateStr),
        jam_masuk: formatTime(row.check_in ?? null),
        status: row.status || 'Absent',
        keterlambatan: lateMinutes,
      })
    }

    const summaryRows = Object.values(summaryByEmployee).map((item, index) => {
      let keterangan = 'Baik'
      if (item.count >= 10) keterangan = 'Sangat Sering'
      else if (item.count >= 6) keterangan = 'Sering'
      else if (item.count >= 3) keterangan = 'Cukup Sering'
      else if (item.count >= 1) keterangan = 'Jarang'

      return {
        no: index + 1,
        nama: item.nama,
        jumlah_hari: item.count,
        total_menit: item.totalLate,
        keterangan,
      }
    })

    const wb = XLSX.utils.book_new()

    // --- Sheet 1: Ringkasan ---
    const ws1 = XLSX.utils.aoa_to_sheet([])
    const s1Headers = ['No', 'Nama Karyawan', 'Hari Terlambat', 'Total Menit', 'Keterangan']
    const s1Cols = [{ wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]
    ws1['!cols'] = s1Cols

    // Title row (row 0)
    XLSX.utils.sheet_add_aoa(ws1, [[title]], { origin: 'A1' })
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ]
    for (let c = 0; c < 5; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws1[addr]) ws1[addr] = { v: '', t: 's' }
      ws1[addr].s = STYLES.title
    }

    // Subtitle row (row 1)
    XLSX.utils.sheet_add_aoa(ws1, [[subtitle]], { origin: 'A2' })
    for (let c = 0; c < 5; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c })
      if (!ws1[addr]) ws1[addr] = { v: '', t: 's' }
      ws1[addr].s = STYLES.subtitle
    }

    // Empty row 2
    XLSX.utils.sheet_add_aoa(ws1, [[]], { origin: 'A3' })

    // Header row (row 3)
    XLSX.utils.sheet_add_aoa(ws1, [s1Headers], { origin: 'A4' })
    for (let c = 0; c < 5; c++) {
      const addr = XLSX.utils.encode_cell({ r: 3, c })
      if (ws1[addr]) ws1[addr].s = STYLES.header
    }

    // Data rows (starting row 4)
    const s1Data = summaryRows.map(r => [r.no, r.nama, r.jumlah_hari, r.total_menit, r.keterangan])
    XLSX.utils.sheet_add_aoa(ws1, s1Data, { origin: 'A5' })
    applyStylesToRange(ws1, 4, 4 + s1Data.length - 1, 5, [0, 2, 3, 4])

    // Apply warning color to "Sangat Sering" / "Sering"
    for (let i = 0; i < summaryRows.length; i++) {
      if (summaryRows[i].keterangan === 'Sangat Sering' || summaryRows[i].keterangan === 'Sering') {
        const addr = XLSX.utils.encode_cell({ r: 4 + i, c: 4 })
        if (ws1[addr]) ws1[addr].s = STYLES.warning
      }
    }

    ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4 + s1Data.length, c: 4 } })
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Keterlambatan')

    // --- Sheet 2: Detail Harian ---
    const ws2 = XLSX.utils.aoa_to_sheet([])
    const s2Title = `DETAIL KEHADIRAN HARIAN — ${reportMonth.toUpperCase()} ${year}`
    const s2Headers = ['No', 'Nama Karyawan', 'Tanggal', 'Hari', 'Jam Masuk', 'Status', 'Terlambat (mnt)']
    const s2Cols = [{ wch: 6 }, { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }]
    ws2['!cols'] = s2Cols

    XLSX.utils.sheet_add_aoa(ws2, [[s2Title]], { origin: 'A1' })
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ]
    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws2[addr]) ws2[addr] = { v: '', t: 's' }
      ws2[addr].s = STYLES.title
    }

    XLSX.utils.sheet_add_aoa(ws2, [[subtitle]], { origin: 'A2' })
    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c })
      if (!ws2[addr]) ws2[addr] = { v: '', t: 's' }
      ws2[addr].s = STYLES.subtitle
    }

    XLSX.utils.sheet_add_aoa(ws2, [[]], { origin: 'A3' })
    XLSX.utils.sheet_add_aoa(ws2, [s2Headers], { origin: 'A4' })
    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r: 3, c })
      if (ws2[addr]) ws2[addr].s = STYLES.header
    }

    const s2Data = detailRows.map((r, i) => [i + 1, r.nama, r.tanggal, r.hari, r.jam_masuk, r.status, r.keterlambatan])
    XLSX.utils.sheet_add_aoa(ws2, s2Data, { origin: 'A5' })
    applyStylesToRange(ws2, 4, 4 + s2Data.length - 1, 7, [0, 3, 4, 5, 6])

    ws2['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4 + s2Data.length, c: 6 } })
    XLSX.utils.book_append_sheet(wb, ws2, 'Detail Kehadiran Harian')

    // Generate buffer
    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const filename = `laporan-kehadiran-${month}-${year}.xlsx`

    return new Response(Buffer.from(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Export attendance error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
