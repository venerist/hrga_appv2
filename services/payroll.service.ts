import { attendanceRepository } from '@/repositories/attendance.repository'
import { employeeRepository } from '@/repositories/employee.repository'
import { payrollRepository } from '@/repositories/payroll.repository'
import type { PayrollDetail, PayrollPeriod } from '@/types/payroll.types'
import { supabase } from '@/lib/supabase'

function formatMoney(value: number) {
  return Math.round(value * 100) / 100
}

export const payrollService = {
  async createPeriod(month: number, year: number): Promise<PayrollPeriod> {
    return payrollRepository.createPeriod({ month, year, status: 'Open' })
  },

  async calculatePayroll(
    periodId: string,
    month: number,
    year: number,
    baseSalaries: Record<string, number> = {}
  ): Promise<PayrollDetail[]> {
    const summaries = await attendanceRepository.getSummaryByMonthYear(month, year)
    const employees = await employeeRepository.getAll()
    const employeeMap = Object.fromEntries(employees.map(emp => [emp.nik, emp]))

    // Fetch approved reimbursements for this month/year
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();
    
    const { data: reimbursements } = await supabase
      .from('reimbursements')
      .select('employee_nik, amount')
      .eq('status', 'Approved')
      .gte('approved_at', startDate)
      .lt('approved_at', endDate);

    const reimbursementMap: Record<string, number> = {};
    if (reimbursements) {
      for (const r of reimbursements) {
        reimbursementMap[r.employee_nik] = (reimbursementMap[r.employee_nik] || 0) + Number(r.amount);
      }
    }

    const grouped: Record<string, { absentDays: number; lateMinutes: number; overtimeMinutes: number }> = {}
    const datesSet = new Set(summaries.map(r => r.date || (r as any).attendance_date));
    const workingDaysInMonth = Math.max(datesSet.size, 20); // Defaulting to at least 20 if no data

    for (const summary of summaries) {
      const key = summary.employee_nik
      grouped[key] = grouped[key] || { absentDays: 0, lateMinutes: 0, overtimeMinutes: 0 }

      if (summary.status === 'Absent' || summary.status === 'Alpa') grouped[key].absentDays++
      if (summary.late_minutes) grouped[key].lateMinutes += summary.late_minutes
      if (summary.overtime_minutes) grouped[key].overtimeMinutes += summary.overtime_minutes
    }

    const details: PayrollDetail[] = []

    for (const [employee_nik, totals] of Object.entries(grouped)) {
      // Base Salary: Assume default 5.000.000 if not defined
      const baseSalary = baseSalaries[employee_nik] ?? 5000000;
      
      // A. Perhitungan Gaji Berdasarkan Kehadiran (Potongan Alpa)
      const absentDeduction = (totals.absentDays / workingDaysInMonth) * baseSalary;
      const attendanceDeduction = formatMoney(absentDeduction);

      // C. Perhitungan Benefit Lembur (Overtime)
      const overtimeHours = totals.overtimeMinutes / 60;
      const overtimePay = formatMoney((baseSalary / 173) * overtimeHours);

      // B. Perhitungan BPJS Kesehatan & Ketenagakerjaan
      // Potongan Karyawan: Kesehatan (1%), JHT (2%), JP (1% dengan batas upah max 10.042.300)
      const bpjsKes = baseSalary * 0.01;
      const jht = baseSalary * 0.02;
      const jpBase = Math.min(baseSalary, 10042300);
      const jp = jpBase * 0.01;
      const totalBpjsDeduction = formatMoney(bpjsKes + jht + jp);

      // D. Manajemen Pengajuan Reimbursement
      const reimbursementAmount = reimbursementMap[employee_nik] || 0;

      // Pajak (Simplified PPh21)
      const taxPph21 = formatMoney(baseSalary * 0.05);

      // Net Salary (Take Home Pay)
      const netSalary = formatMoney(baseSalary - attendanceDeduction + overtimePay - totalBpjsDeduction - taxPph21 + reimbursementAmount);

      details.push({
        id: '',
        period_id: periodId,
        employee_nik,
        base_salary: baseSalary,
        attendance_deduction: attendanceDeduction,
        overtime_pay: overtimePay,
        reimbursement: reimbursementAmount,
        bpjs: totalBpjsDeduction,
        tax_pph21: taxPph21,
        net_salary: netSalary,
        created_at: new Date().toISOString(),
      })
    }

    return details
  },

  async savePayrollDetails(details: Omit<PayrollDetail, 'id' | 'created_at'>[]): Promise<void> {
    await payrollRepository.createDetails(details)
  }
}
