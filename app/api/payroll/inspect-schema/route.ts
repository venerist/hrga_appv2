import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    // Query 1: Get one row from employees to see its keys/columns
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(1)

    // Query 2: Get information_schema columns for 'employees'
    const { data: empColumns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name_param: 'employees' })
      .select('*')

    // If RPC doesn't exist, we will query via postgres direct if possible, 
    // or just return the keys of the first row of employees.
    const sampleEmployee = empData && empData.length > 0 ? empData[0] : null
    const employeeKeys = sampleEmployee ? Object.keys(sampleEmployee) : []

    // Let's also get sample row from attendance_summary
    const { data: attData } = await supabase
      .from('attendance_summary')
      .select('*')
      .limit(1)
    const sampleAttendance = attData && attData.length > 0 ? attData[0] : null
    const attendanceKeys = sampleAttendance ? Object.keys(sampleAttendance) : []

    return NextResponse.json({
      success: true,
      employeeKeys,
      sampleEmployee,
      attendanceKeys,
      sampleAttendance,
      colError: colError ? colError.message : null
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    })
  }
}
