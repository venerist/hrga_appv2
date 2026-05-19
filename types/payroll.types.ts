export type PayrollPeriodStatus = 'Open' | 'Processing' | 'Approved' | 'Closed'

export interface PayrollPeriod {
  id: string
  month: number
  year: number
  status: PayrollPeriodStatus
  created_at: string
}

export interface PayrollDetail {
  id: string
  period_id: string
  employee_nik: string
  base_salary: number
  attendance_deduction: number
  overtime_pay: number
  reimbursement: number
  bpjs: number
  tax_pph21: number
  net_salary: number
  created_at: string
  employee_name?: string
  employee_position?: string
}

export interface PayrollSetting {
  id: string
  key: string
  value: string
  description: string | null
  updated_at: string
}
