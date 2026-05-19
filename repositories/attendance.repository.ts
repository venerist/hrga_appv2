// Attendance repository — all Supabase interactions for both legacy and new attendance tables

import { supabase } from '@/lib/supabase'
import type {
  Absensi,
  AttendanceImportBatch,
  AttendanceImportError,
  AttendanceOverride,
  AttendanceRaw,
  AttendanceRecord,
  AttendanceSummary,
  AuditLog,
} from '@/types/attendance.types'

export const attendanceRepository = {
  async getAll(periode?: string): Promise<Absensi[]> {
    let query = supabase
      .from('absensi')
      .select('*')
      .order('tanggal', { ascending: false })

    if (periode) {
      query = query.eq('periode', periode)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as Absensi[]) || []
  },

  async getDashboardData(): Promise<Pick<Absensi, 'nama' | 'tanggal' | 'status' | 'menit_terlambat' | 'departemen'>[]> {
    const { data, error } = await supabase
      .from('absensi')
      .select('nama,tanggal,status,menit_terlambat,departemen')
      .order('tanggal', { ascending: false })

    if (error) throw error
    return data || []
  },

  async bulkUpsert(records: Omit<Absensi, 'id' | 'created_at'>[], periode: string): Promise<void> {
    const { error: deleteError } = await supabase
      .from('absensi')
      .delete()
      .eq('periode', periode)

    if (deleteError) throw deleteError

    const { error: insertError } = await supabase
      .from('absensi')
      .insert(records)

    if (insertError) throw insertError
  },

  async createImportBatch(batch: Omit<AttendanceImportBatch, 'id'>): Promise<string> {
    const { data, error } = await supabase
      .from('attendance_import_batches')
      .insert(batch)
      .select('id')
      .single()

    if (error) throw error
    return (data as { id: string }).id
  },

  async insertRawAttendance(records: Omit<AttendanceRaw, 'id' | 'created_at'>[]): Promise<void> {
    if (records.length === 0) return
    const { error } = await supabase
      .from('attendance_raw')
      .insert(records)

    if (error) throw error
  },

  async getSummaryByMonthYear(month: number, year: number): Promise<AttendanceSummary[]> {
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('attendance_summary')
      .select('*')
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true })

    if (error) throw error
    return (data as AttendanceSummary[]) || []
  },

  async getSummaryByNikAndDate(employeeNik: string, date: string): Promise<AttendanceSummary | null> {
    const { data, error } = await supabase
      .from('attendance_summary')
      .select('*')
      .eq('employee_nik', employeeNik)
      .eq('attendance_date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as AttendanceSummary
  },

  async bulkUpsertSummary(records: Omit<AttendanceSummary, 'id' | 'updated_at'>[]): Promise<void> {
    if (records.length === 0) return

    const attendance_date = records[0].attendance_date
    const year = new Date(attendance_date).getFullYear()
    const month = new Date(attendance_date).getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { error: deleteError } = await supabase
      .from('attendance_summary')
      .delete()
      .gte('attendance_date', start)
      .lte('attendance_date', end)

    if (deleteError) throw deleteError

    const { error: insertError } = await supabase
      .from('attendance_summary')
      .insert(records)

    if (insertError) throw insertError
  },

  async upsertSummaryRow(record: Omit<AttendanceSummary, 'id' | 'updated_at'>): Promise<void> {
    const { error } = await supabase
      .from('attendance_summary')
      .upsert(record, { onConflict: ['employee_nik', 'attendance_date'], returning: 'minimal' })

    if (error) throw error
  },

  async createOverride(record: Omit<AttendanceOverride, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('attendance_overrides')
      .insert(record)

    if (error) throw error
  },

  async getOverridesByMonthYear(month: number, year: number): Promise<AttendanceOverride[]> {
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('attendance_overrides')
      .select('*')
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true })

    if (error) throw error
    return (data as AttendanceOverride[]) || []
  },

  async insertAttendanceRecords(records: Omit<AttendanceRecord, 'id' | 'created_at'>[]): Promise<void> {
    if (records.length === 0) return
    const { error } = await supabase
      .from('attendance_records')
      .insert(records)

    if (error) throw error
  },

  async getAttendanceRecords(niks: string[], start: string, end: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .in('employee_nik', niks)
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('scan_time', { ascending: true })

    if (error) throw error
    return (data as AttendanceRecord[]) || []
  },

  async createImportErrors(errors: Omit<AttendanceImportError, 'id' | 'created_at'>[]): Promise<void> {
    if (errors.length === 0) return
    const { error } = await supabase
      .from('attendance_import_errors')
      .insert(errors)

    if (error) throw error
  },

  async createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert(log)

    if (error) throw error
  },

  async updateImportBatch(id: string, updates: Partial<AttendanceImportBatch>): Promise<void> {
    const { error } = await supabase
      .from('attendance_import_batches')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  },
}
