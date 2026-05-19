import * as XLSX from 'xlsx-js-style'
import { attendanceRepository } from '@/repositories/attendance.repository'
import { employeeRepository } from '@/repositories/employee.repository'
import type { AttendanceSummary } from '@/types/attendance.types'

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

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

export const exportService = {
  async buildAttendanceDelayWorkbook(month: number, year: number) {
    const summaries = await attendanceRepository.getSummaryByMonthYear(month, year)
    const employees = await employeeRepository.getAll()
    const employeeNames = Object.fromEntries(employees.map(emp => [emp.nik, emp.name]))

    const reportMonth = MONTH_NAMES_ID[month - 1] ?? `${month}`
    const title = `LAPORAN KETERLAMBATAN KARYAWAN - ${reportMonth.toUpperCase()} ${year}`
    const subtitle = 'Jam Kerja: 08.00 - 16.00'

    const detailRows = summaries.map((row, index) => ({
      no: index + 1,
      nama: employeeNames[row.employee_nik] ?? row.employee_nik,
      tanggal: new Date(row.date),
      hari: formatDayName(row.date),
      jam_masuk: formatTime(row.check_in),
      keterlambatan: row.late_minutes || 0,
    }))

    const summaryByEmployee: Record<string, { nama: string; count: number; totalLate: number }> = {}
    for (const row of summaries) {
      if (!row.late_minutes) continue
      const nik = row.employee_nik
      const key = nik
      if (!summaryByEmployee[key]) {
        summaryByEmployee[key] = {
          nama: employeeNames[nik] ?? nik,
          count: 0,
          totalLate: 0,
        }
      }
      summaryByEmployee[key].count += row.late_minutes > 0 ? 1 : 0
      summaryByEmployee[key].totalLate += row.late_minutes
    }

    const summaryRows = Object.values(summaryByEmployee).map((item, index) => {
      let keterangan = 'Jarang'
      if (item.count >= 10) keterangan = 'Sangat Sering'
      else if (item.count >= 6) keterangan = 'Sering'
      else if (item.count >= 3) keterangan = 'Cukup'

      return {
        no: index + 1,
        nama: item.nama,
        jumlah_hari_terlambat: item.count,
        total_durasi_keterlambatan: item.totalLate,
        keterangan,
      }
    })

    const wb = XLSX.utils.book_new()

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows, { header: ['no', 'nama', 'jumlah_hari_terlambat', 'total_durasi_keterlambatan', 'keterangan'] })
    wsSummary['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 20 }, { wch: 24 }, { wch: 18 }]
    wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }]
    XLSX.utils.sheet_add_aoa(wsSummary, [[title]], { origin: 'A1' })
    XLSX.utils.sheet_add_aoa(wsSummary, [[subtitle]], { origin: 'A2' })
    XLSX.utils.sheet_add_aoa(wsSummary, [['No', 'Nama Karyawan', 'Jumlah Hari Terlambat', 'Total Durasi Keterlambatan', 'Keterangan']], { origin: 'A4' })
    XLSX.utils.sheet_add_json(wsSummary, summaryRows, { origin: 'A5', skipHeader: true })

    const wsDetail = XLSX.utils.json_to_sheet(detailRows, { header: ['no', 'nama', 'tanggal', 'hari', 'jam_masuk', 'keterlambatan'] })
    wsDetail['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }]
    wsDetail['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }]
    XLSX.utils.sheet_add_aoa(wsDetail, [[`DETAIL KETERLAMBATAN PER KARYAWAN PER HARI - ${reportMonth.toUpperCase()} ${year}`]], { origin: 'A1' })
    XLSX.utils.sheet_add_aoa(wsDetail, [[subtitle]], { origin: 'A2' })
    XLSX.utils.sheet_add_aoa(wsDetail, [['No', 'Nama Karyawan', 'Tanggal', 'Hari', 'Jam Masuk', 'Keterlambatan']], { origin: 'A4' })
    XLSX.utils.sheet_add_json(wsDetail, detailRows, { origin: 'A5', skipHeader: true })

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Keterlambatan')
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Keterlambatan')

    return wb
  },
}
