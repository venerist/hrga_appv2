import * as XLSX from 'xlsx-js-style'
import { attendanceRepository } from '@/repositories/attendance.repository'
import { employeeRepository } from '@/repositories/employee.repository'
import { nationalHolidayService } from '@/services/attendance/national-holiday.service'
import { isWorkDay } from '@/lib/attendance/attendance-utils'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, getDay } from 'date-fns'

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const attendanceReportService = {
  async generateMonthlyReport(month: number, year: number) {
    const employees = await employeeRepository.getAll()
    const summaries = await attendanceRepository.getSummaryByMonthYear(month, year)
    const holidays = await nationalHolidayService.getHolidays(year)
    const holidayDates = holidays.map(h => h.holiday_date)

    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(new Date(year, month - 1))
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // 1. Prepare Data for Rekap Ringkasan
    const summaryMap = new Map<string, any[]>() // NIK -> SummaryRows[]
    for (const s of summaries) {
      if (!summaryMap.has(s.employee_nik)) summaryMap.set(s.employee_nik, [])
      summaryMap.get(s.employee_nik)!.push(s)
    }

    const rekapRingkasan = employees.map((emp, index) => {
      const empSummaries = summaryMap.get(emp.nik) || []
      const totalHariKerja = daysInMonth.filter(d => isWorkDay(d, holidayDates)).length
      const totalHadir = empSummaries.filter(s => s.status !== 'Absent' && s.status !== 'Sakit' && s.status !== 'Izin').length
      const totalTidakHadir = totalHariKerja - totalHadir
      const pctKetidakhadiran = totalHariKerja > 0 ? (totalTidakHadir / totalHariKerja) * 100 : 0
      const totalTerlambat = empSummaries.reduce((acc, s) => acc + (s.late_minutes || 0), 0)
      const totalOvertime = empSummaries.reduce((acc, s) => acc + (s.overtime_minutes || 0), 0)

      return {
        'No': index + 1,
        'Nama': emp.name,
        'NIK': emp.nik,
        'Divisi': emp.division,
        'Jabatan': emp.position,
        'Total Hari Kerja': totalHariKerja,
        'Total Hadir': totalHadir,
        'Total Tidak Hadir': totalTidakHadir,
        'Persentase Ketidakhadiran': `${pctKetidakhadiran.toFixed(1)}%`,
        'Total Terlambat': totalTerlambat,
        'Total Overtime': totalOvertime
      }
    })

    // 2. List Harian Absensi
    const listHarian = daysInMonth.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const daySummaries = summaries.filter(s => s.attendance_date === dateStr)
      const absents = employees.filter(emp => !daySummaries.find(s => s.employee_nik === emp.nik))
      
      const isWork = isWorkDay(day, holidayDates)
      let statusHari = 'Hari Kerja'
      if (isSunday(day)) statusHari = 'Minggu'
      else if (holidayDates.includes(dateStr)) statusHari = `Libur: ${holidays.find(h => h.holiday_date === dateStr)?.name}`

      return {
        'Tanggal': dateStr,
        'Hari': format(day, 'EEEE', { locale: undefined }), // Browser default or use id locale
        'Status Hari': statusHari,
        'Jumlah Tidak Hadir': isWork ? absents.length : 0,
        'Nama Karyawan Tidak Hadir': isWork ? absents.map(a => a.name).join(', ') : '-'
      }
    })

    // 3. Matriks Kehadiran
    const matrix = employees.map(emp => {
      const row: any = { 'Nama Karyawan': emp.name, 'NIK': emp.nik }
      const empSummaries = summaryMap.get(emp.nik) || []
      
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const daySummary = empSummaries.find(s => s.attendance_date === dateStr)
        const isWork = isWorkDay(day, holidayDates)
        
        let val = ''
        if (!isWork) {
          val = '-'
        } else if (!daySummary) {
          val = '✗'
        } else {
          if (daySummary.late_minutes > 0) val += 'L'
          if (daySummary.overtime_minutes > 0) val += 'OT'
          if (val === '') val = '✓'
        }
        row[format(day, 'dd')] = val
      })
      return row
    })

    // Excel Generation
    const wb = XLSX.utils.book_new()
    
    const wsRekap = XLSX.utils.json_to_sheet(rekapRingkasan)
    const wsList = XLSX.utils.json_to_sheet(listHarian)
    const wsMatrix = XLSX.utils.json_to_sheet(matrix)

    // Styling & Formatting (Basic for xlsx lib, more advanced requires xlsx-js-style but we'll use basic xlsx)
    // xlsx doesn't support bold/colors in the open source version easily without third party libs
    // but we can set column widths

    wsRekap['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 22 }, { wch: 15 }, { wch: 15 }]
    wsList['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 50 }]

    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Ringkasan')
    XLSX.utils.book_append_sheet(wb, wsList, 'List Harian Absensi')
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Kehadiran')

    const fileName = `Rekap_Absensi_${MONTH_NAMES[month - 1]}_${year}.xlsx`
    
    return { wb, fileName }
  }
}
