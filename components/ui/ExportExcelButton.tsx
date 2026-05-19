import React from 'react'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'

interface ExportExcelButtonProps {
  data: any[]
  filename: string
  sheetName?: string
  className?: string
  disabled?: boolean
}

export function ExportExcelButton({ data, filename, sheetName = 'Data', className, disabled }: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return

    const wb = XLSX.utils.book_new()
    
    // Convert data to sheet
    const ws = XLSX.utils.json_to_sheet(data)
    
    // Style the header row (row 0)
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "F97316" } }, // Tailwind orange-500 equivalent for HRIS theme
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      }
    }

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    
    // Apply styling to header
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = headerStyle
    }

    // Auto-width columns
    const colWidths = Object.keys(data[0] || {}).map(key => {
      let maxLength = key.length
      data.forEach(row => {
        const val = row[key] ? String(row[key]) : ''
        if (val.length > maxLength) maxLength = val.length
      })
      return { wch: Math.min(maxLength + 2, 50) } // Max width 50
    })
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className={`gap-2 ${className}`}
    >
      <FileDown className="w-4 h-4" />
      Export to Excel
    </Button>
  )
}
