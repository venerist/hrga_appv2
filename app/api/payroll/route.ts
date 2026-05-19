import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function getProp(obj: any, keys: string[]): any {
  if (!obj) return null
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
    const ku = k.toUpperCase()
    if (obj[ku] !== undefined && obj[ku] !== null) return obj[ku]
    const kl = k.toLowerCase()
    if (obj[kl] !== undefined && obj[kl] !== null) return obj[kl]
    const kUnderscore = k.replace(/\s+/g, '_')
    if (obj[kUnderscore] !== undefined && obj[kUnderscore] !== null) return obj[kUnderscore]
    if (obj[kUnderscore.toUpperCase()] !== undefined && obj[kUnderscore.toUpperCase()] !== null) return obj[kUnderscore.toUpperCase()]
    if (obj[kUnderscore.toLowerCase()] !== undefined && obj[kUnderscore.toLowerCase()] !== null) return obj[kUnderscore.toLowerCase()]
    const kSpace = k.replace(/_+/g, ' ')
    if (obj[kSpace] !== undefined && obj[kSpace] !== null) return obj[kSpace]
    if (obj[kSpace.toUpperCase()] !== undefined && obj[kSpace.toUpperCase()] !== null) return obj[kSpace.toUpperCase()]
    if (obj[kSpace.toLowerCase()] !== undefined && obj[kSpace.toLowerCase()] !== null) return obj[kSpace.toLowerCase()]
  }
  return null
}

// GET /api/payroll?period_id=xxx — get payroll details for a period
export async function GET(req: NextRequest) {
  try {
    const periodId = req.nextUrl.searchParams.get('period_id')

    if (!periodId) {
      return NextResponse.json(
        { success: false, error: 'period_id query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Fetch the period info
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .single()

    if (periodError || !period) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Fetch payroll details
    const { data: details, error: detailsError } = await supabase
      .from('payroll_details')
      .select('*')
      .eq('period_id', periodId)
      .order('employee_nik', { ascending: true })

    if (detailsError) {
      console.error('[GET /api/payroll] details error:', detailsError)
      return NextResponse.json(
        { success: false, error: detailsError.message },
        { status: 500 }
      )
    }

    // Fetch employee details to join with the payroll details
    const { data: employees } = await supabase
      .from('employees')
      .select('*')

    const empMap = Object.fromEntries((employees || []).map((e: any) => {
      const nikKey = getProp(e, ['nik', 'employee_nik', 'id', 'no'])
      return [nikKey, e]
    }))
    
    const enrichedDetails = (details || []).map((d: any) => {
      const emp = empMap[d.employee_nik] || {}
      return {
        ...d,
        employee_name: getProp(emp, ['name', 'nama', 'NAMA', 'NAME']) || 'Karyawan',
        employee_position: getProp(emp, ['jabatan', 'position', 'JABATAN', 'POSITION', 'level', 'LEVEL']) || 'Staff',
      }
    })

    const estimatedNet = enrichedDetails.reduce(
      (sum: number, d: any) => sum + Number(d.net_salary || 0),
      0
    )

    // Count total periods for summary card
    const { count } = await supabase
      .from('payroll_periods')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: {
        period,
        details: enrichedDetails,
        summary: {
          period_count: count || 0,
          detail_count: enrichedDetails.length,
          estimated_net: estimatedNet,
        },
      },
    })
  } catch (err: any) {
    console.error('[GET /api/payroll] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
