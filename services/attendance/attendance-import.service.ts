import * as XLSX from 'xlsx-js-style'
import { attendanceRepository } from '@/repositories/attendance.repository'
import { employeeRepository } from '@/repositories/employee.repository'
import { nationalHolidayService } from '@/services/attendance/national-holiday.service'
import { calculateStatus, isWorkDay } from '@/lib/attendance/attendance-utils'
import type { 
  AttendanceRecord, 
  AttendanceSummary, 
  AttendanceImportBatch,
  AttendanceImportError 
} from '@/types/attendance.types'
import { format, parse, isValid } from 'date-fns'

export const attendanceImportService = {
  async processImport(
    file: File,
    month: number,
    year: number,
    userId: string | null,
    duplicateOption: 'skip' | 'replace' | 'merge' = 'skip'
  ) {
    // 1. Read Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (rawData.length === 0) throw new Error('File is empty')

    // 2. Map Columns
    const firstRow = rawData[0]
    const columnMap = this.detectColumns(firstRow)
    
    // 3. Create Import Batch record
    const batchId = await attendanceRepository.createImportBatch({
      file_name: file.name,
      uploaded_by: userId,
      upload_date: new Date().toISOString(),
      total_records: rawData.length,
      month,
      year,
      valid_rows: 0,
      invalid_rows: 0,
      matched_employees: 0,
      unmatched_rows: 0,
      status: 'Processing'
    })

    // 4. Get Master Data
    const employees = await employeeRepository.getAll()
    const employeeMap = new Map(employees.map(e => [e.nik.toLowerCase(), e]))
    const holidays = await nationalHolidayService.getHolidays(year)
    const holidayDates = holidays.map(h => h.holiday_date)

    const validRecords: Omit<AttendanceRecord, 'id' | 'created_at'>[] = []
    const errors: Omit<AttendanceImportError, 'id' | 'created_at'>[] = []
    
    let validCount = 0
    let invalidCount = 0
    let matchedCount = 0
    let unmatchedCount = 0

    // 5. Clean and Match
    for (const row of rawData) {
      try {
        const nikRaw = String(row[columnMap.nik] || '').trim()
        const nameRaw = String(row[columnMap.nama] || '').trim()
        const scanTimeRaw = row[columnMap.scanTime]

        // Validation & Cleaning
        if (!nikRaw || !scanTimeRaw) {
          throw new Error('Missing NIK or Scan Time')
        }

        // Detect invalid pure numbers in scan time (e.g. 14, 123456)
        if (typeof scanTimeRaw === 'number' || /^\d+$/.test(String(scanTimeRaw))) {
           if (String(scanTimeRaw).length < 10) { // Probably not a timestamp but just a count or partial date
             throw new Error(`Invalid scan time format: ${scanTimeRaw}`)
           }
        }

        let scanTime: Date
        if (scanTimeRaw instanceof Date) {
          scanTime = scanTimeRaw
        } else {
          // Attempt to parse string
          scanTime = new Date(scanTimeRaw)
          if (!isValid(scanTime)) {
             // Try common fingerprint formats
             // DD/MM/YYYY HH:mm:ss or YYYY-MM-DD HH:mm:ss
             scanTime = parse(String(scanTimeRaw), 'dd/MM/yyyy HH:mm:ss', new Date())
             if (!isValid(scanTime)) {
                scanTime = parse(String(scanTimeRaw), 'yyyy-MM-dd HH:mm:ss', new Date())
             }
          }
        }

        if (!isValid(scanTime)) {
          throw new Error(`Could not parse scan time: ${scanTimeRaw}`)
        }

        // Check month/year match
        if (scanTime.getMonth() + 1 !== month || scanTime.getFullYear() !== year) {
          // Depending on requirements, we might skip or record as error
          // For now let's just skip if it's way off, or just accept if it's within range
        }

        const nik = nikRaw.toLowerCase()
        const employee = employeeMap.get(nik)
        
        if (employee) {
          matchedCount++
        } else {
          unmatchedCount++
          // We still keep the record but mark as unmatched? 
          // Requirements say "Cocokkan data dengan Master Karyawan", implies we might skip unmatched or report them.
          // Let's record an error for unmatched
          throw new Error(`Employee with NIK ${nikRaw} not found in master data`)
        }

        validRecords.push({
          employee_nik: employee.nik, // Use official NIK
          attendance_date: format(scanTime, 'yyyy-MM-dd'),
          scan_time: scanTime.toISOString(),
          batch_id
        })
        validCount++

      } catch (err: any) {
        invalidCount++
        errors.push({
          batch_id,
          row_data: row,
          error_message: err.message
        })
      }
    }

    // 6. Save to DB
    // Save records
    await attendanceRepository.insertAttendanceRecords(validRecords)
    
    // Save errors
    if (errors.length > 0) {
      await attendanceRepository.createImportErrors(errors)
    }

    // 7. Calculate Summary (Daily Summary)
    // Group records by Employee NIK + Date
    const grouped = new Map<string, string[]>() // Key: NIK|Date, Value: ScanTimes[]
    for (const rec of validRecords) {
      const key = `${rec.employee_nik}|${rec.attendance_date}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(rec.scan_time)
    }

    const summaries: Omit<AttendanceSummary, 'id' | 'updated_at'>[] = []
    
    for (const [key, scans] of grouped.entries()) {
      const [nik, dateStr] = key.split('|')
      const date = new Date(dateStr)
      const workDay = isWorkDay(date, holidayDates)
      
      const { status, lateMinutes, overtimeMinutes } = calculateStatus(scans, workDay)
      
      summaries.push({
        employee_nik: nik,
        attendance_date: dateStr,
        status,
        late_minutes: lateMinutes,
        overtime_minutes: overtimeMinutes,
        work_hours: 8, // Default, can be calculated more accurately
        check_in: scans.sort()[0],
        check_out: scans.sort()[scans.length - 1]
      })
    }

    await attendanceRepository.bulkUpsertSummary(summaries)

    // 8. Update Batch Summary
    await attendanceRepository.updateImportBatch(batchId, {
      status: 'Completed',
      valid_rows: validCount,
      invalid_rows: invalidCount,
      matched_employees: matchedCount,
      unmatched_rows: unmatchedCount
    })

    // 9. Audit Log
    await attendanceRepository.createAuditLog({
      action: 'attendance_import_created',
      user_id: userId,
      metadata: {
        file_name: file.name,
        month,
        year,
        total_rows: rawData.length,
        valid_rows: validCount,
        invalid_rows: invalidCount,
        matched_employees: matchedCount,
        unmatched_rows: unmatchedCount,
        imported_by: userId,
        imported_at: new Date().toISOString()
      }
    })

    return {
      batchId,
      summary: {
        total: rawData.length,
        valid: validCount,
        invalid: invalidCount,
        matched: matchedCount,
        unmatched: unmatchedCount
      }
    }
  },

  detectColumns(row: any) {
    const keys = Object.keys(row)
    const map = {
      nama: '',
      nik: '',
      scanTime: '',
    }

    for (const key of keys) {
      const k = key.toLowerCase()
      if (k.includes('nama') || k.includes('name')) map.nama = key
      if (k.includes('nik') || k.includes('id') || k.includes('no.id') || k.includes('pin')) map.nik = key
      if (k.includes('waktu') || k.includes('scan') || k.includes('jam') || k.includes('time')) map.scanTime = key
    }

    // Fallback defaults if not found
    if (!map.nama) map.nama = keys[0]
    if (!map.nik) map.nik = keys[1]
    if (!map.scanTime) map.scanTime = keys[2]

    return map
  }
}
