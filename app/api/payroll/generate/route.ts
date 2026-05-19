import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// BPJS Constants (Indonesia regulations)
const BPJS = {
  KESEHATAN_COMPANY: 0.04,
  KESEHATAN_EMPLOYEE: 0.01,
  JHT_COMPANY: 0.037,
  JHT_EMPLOYEE: 0.02,
  JP_COMPANY: 0.02,
  JP_EMPLOYEE: 0.01,
  JP_MAX_SALARY: 10042300, // Batas atas upah JP
  JKK_COMPANY: 0.0024,    // Risiko rendah
  JKM_COMPANY: 0.003,
}

const DEFAULT_WORKING_DAYS = 22

function round(value: number): number {
  return Math.round(value)
}

function getProp(obj: any, keys: string[]): any {
  if (!obj) return null
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
    
    // Try exact uppercase
    const ku = k.toUpperCase()
    if (obj[ku] !== undefined && obj[ku] !== null) return obj[ku]
    
    // Try exact lowercase
    const kl = k.toLowerCase()
    if (obj[kl] !== undefined && obj[kl] !== null) return obj[kl]

    // Try space to underscore
    const kUnderscore = k.replace(/\s+/g, '_')
    if (obj[kUnderscore] !== undefined && obj[kUnderscore] !== null) return obj[kUnderscore]
    if (obj[kUnderscore.toUpperCase()] !== undefined && obj[kUnderscore.toUpperCase()] !== null) return obj[kUnderscore.toUpperCase()]
    if (obj[kUnderscore.toLowerCase()] !== undefined && obj[kUnderscore.toLowerCase()] !== null) return obj[kUnderscore.toLowerCase()]

    // Try underscore to space
    const kSpace = k.replace(/_+/g, ' ')
    if (obj[kSpace] !== undefined && obj[kSpace] !== null) return obj[kSpace]
    if (obj[kSpace.toUpperCase()] !== undefined && obj[kSpace.toUpperCase()] !== null) return obj[kSpace.toUpperCase()]
    if (obj[kSpace.toLowerCase()] !== undefined && obj[kSpace.toLowerCase()] !== null) return obj[kSpace.toLowerCase()]
  }
  return null
}

// POST /api/payroll/generate — generate payroll for a period
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { period_id } = body

    if (!period_id) {
      return NextResponse.json(
        { success: false, error: 'period_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 1. Get the period
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', period_id)
      .single()

    if (periodError || !period) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    const { month, year } = period

    // 2. Update period status to Processing
    await supabase
      .from('payroll_periods')
      .update({ status: 'Processing' })
      .eq('id', period_id)

    // 3. Get all active employees (Master Data Karyawan)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'Active')

    if (empError) {
      console.error('[generate] employees error:', empError)
      return NextResponse.json(
        { success: false, error: empError.message },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      await supabase
        .from('payroll_periods')
        .update({ status: 'Open' })
        .eq('id', period_id)
      return NextResponse.json(
        { success: false, error: 'Tidak ada karyawan aktif ditemukan', warnings: ['No active employees'] },
        { status: 400 }
      )
    }

    // 4. Get attendance_summary for this month/year
    const lastDay = new Date(year, month, 0).getDate()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: attendanceSummaries, error: attError } = await supabase
      .from('attendance_summary')
      .select('employee_nik, date, status, late_minutes, overtime_minutes, work_hours')
      .gte('date', startDate)
      .lte('date', endDate)

    let summaries = attendanceSummaries
    if (attError) {
      console.warn('[generate] attendance_summary query with "date" failed, trying "attendance_date":', attError.message)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('attendance_summary')
        .select('employee_nik, attendance_date, status, late_minutes, overtime_minutes, work_hours')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)

      if (fallbackError) {
        console.error('[generate] Both attendance_summary column names failed:', fallbackError.message)
        summaries = []
      } else {
        summaries = (fallbackData || []).map((r: any) => ({
          ...r,
          date: r.attendance_date,
        }))
      }
    }

    // 5. Get approved reimbursements for this period
    const periodStart = new Date(year, month - 1, 1).toISOString()
    const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString()

    let reimbursementMap: Record<string, number> = {}
    const { data: reimbursements, error: reimbError } = await supabase
      .from('reimbursements')
      .select('employee_nik, amount')
      .eq('status', 'Approved')
      .gte('approved_at', periodStart)
      .lte('approved_at', periodEnd)

    if (!reimbError && reimbursements) {
      for (const r of reimbursements) {
        reimbursementMap[r.employee_nik] = (reimbursementMap[r.employee_nik] || 0) + Number(r.amount)
      }
    }

    // 6. Aggregate attendance data per employee
    const attMap: Record<string, { absentDays: number; overtimeMinutes: number; totalDays: number }> = {}
    const allDates = new Set<string>()

    if (summaries && summaries.length > 0) {
      for (const row of summaries as any[]) {
        const nik = row.employee_nik
        const dateStr = row.date || row.attendance_date
        if (dateStr) allDates.add(dateStr)

        if (!attMap[nik]) {
          attMap[nik] = { absentDays: 0, overtimeMinutes: 0, totalDays: 0 }
        }
        attMap[nik].totalDays++

        const status = (row.status || '').toLowerCase()
        if (status === 'absent' || status === 'alpa') {
          attMap[nik].absentDays++
        }
        if (row.overtime_minutes) {
          attMap[nik].overtimeMinutes += Number(row.overtime_minutes)
        }
      }
    }

    const workingDays = Math.max(allDates.size, DEFAULT_WORKING_DAYS)

    // 7. Calculate payroll for each employee
    const warnings: string[] = []
    const payrollDetails: any[] = []

    for (const emp of employees) {
      // Map NIK, Nama, Jabatan robustly supporting all variations
      const nik = getProp(emp, ['nik', 'employee_nik', 'id', 'no'])
      const name = getProp(emp, ['name', 'nama', 'NAMA', 'NAME']) || 'Karyawan'
      const jabatan = getProp(emp, ['jabatan', 'position', 'JABATAN', 'POSITION', 'level', 'LEVEL']) || 'Staff'
      
      // Map total_gaji robustly
      const rawGaji = getProp(emp, ['total_gaji', 'total gaji', 'gaji_pokok', 'gaji pokok'])
      const totalGaji = rawGaji !== null ? Number(rawGaji) : NaN

      // Requirement 5: If total_gaji is null, empty, or invalid -> skip and add warning
      if (!rawGaji || isNaN(totalGaji) || totalGaji <= 0) {
        warnings.push(`Karyawan "${name}" (NIK: ${nik}) dilewati karena total_gaji kosong atau tidak valid.`)
        continue
      }

      const att = attMap[nik] || { absentDays: 0, overtimeMinutes: 0, totalDays: 0 }

      // A. Attendance deduction: (Alpa / working days) * Gaji Pokok
      const absenceDeduction = workingDays > 0
        ? round((att.absentDays / workingDays) * totalGaji)
        : 0

      // B. Overtime pay: total overtime hours * (total_gaji / 173)
      const overtimeHours = att.overtimeMinutes / 60
      const hourlyRate = totalGaji / 173
      const overtimePay = round(overtimeHours * hourlyRate)

      // C. BPJS Calculations based on total_gaji
      const jpBase = Math.min(totalGaji, BPJS.JP_MAX_SALARY)

      // Employee deductions
      const bpjsKesEmployee = round(totalGaji * BPJS.KESEHATAN_EMPLOYEE)
      const jhtEmployee = round(totalGaji * BPJS.JHT_EMPLOYEE)
      const jpEmployee = round(jpBase * BPJS.JP_EMPLOYEE)
      const totalBpjsEmployee = bpjsKesEmployee + jhtEmployee + jpEmployee

      // D. Reimbursement (added to net salary without deductions/taxes)
      const reimbursement = reimbursementMap[nik] || 0

      // E. PPh21 (simplified flat 5% on total_gaji)
      const taxPph21 = round(totalGaji * 0.05)

      // F. Gross pay = total_gaji + overtime_pay
      const grossPay = totalGaji + overtimePay

      // G. Employee deductions total
      const employeeDeductions = absenceDeduction + totalBpjsEmployee + taxPph21

      // H. Net pay (Take Home Pay)
      const netSalary = grossPay - employeeDeductions + reimbursement

      payrollDetails.push({
        period_id,
        employee_nik: nik,
        base_salary: totalGaji,
        attendance_deduction: absenceDeduction,
        overtime_pay: overtimePay,
        reimbursement: reimbursement,
        bpjs: totalBpjsEmployee,
        tax_pph21: taxPph21,
        net_salary: netSalary,
      })
    }

    // 8. Upsert payroll_details
    const { error: deleteError } = await supabase
      .from('payroll_details')
      .delete()
      .eq('period_id', period_id)

    if (deleteError) {
      console.error('[generate] delete old details error:', deleteError)
    }

    if (payrollDetails.length > 0) {
      const { error: insertError } = await supabase
        .from('payroll_details')
        .insert(payrollDetails)

      if (insertError) {
        console.error('[generate] insert details error:', insertError)
        await supabase
          .from('payroll_periods')
          .update({ status: 'Open' })
          .eq('id', period_id)
        return NextResponse.json(
          { success: false, error: `Gagal menyimpan payroll_details: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    // 9. Fetch details joined with active employee details for the UI
    const { data: savedDetails } = await supabase
      .from('payroll_details')
      .select('*')
      .eq('period_id', period_id)
      .order('employee_nik', { ascending: true })

    const empMap = Object.fromEntries(employees.map((e: any) => {
      const nikKey = getProp(e, ['nik', 'employee_nik', 'id', 'no'])
      return [nikKey, e]
    }))
    const details = (savedDetails || []).map((d: any) => {
      const emp = empMap[d.employee_nik] || {}
      return {
        ...d,
        employee_name: getProp(emp, ['name', 'nama', 'NAMA', 'NAME']) || 'Karyawan',
        employee_position: getProp(emp, ['jabatan', 'position', 'JABATAN', 'POSITION', 'level', 'LEVEL']) || 'Staff',
      }
    })

    // 10. Update period status to Open
    await supabase
      .from('payroll_periods')
      .update({ status: 'Open' })
      .eq('id', period_id)

    const estimatedNet = details.reduce((sum: number, d: any) => sum + Number(d.net_salary || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        period,
        details,
        summary: {
          detail_count: details.length,
          estimated_net: estimatedNet,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    })
  } catch (err: any) {
    console.error('[POST /api/payroll/generate] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
