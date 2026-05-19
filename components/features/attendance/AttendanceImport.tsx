'use client'

import React, { useState, useEffect } from 'react'
import { useAttendanceStore } from '@/store/attendance.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { DataTable } from '@/components/ui/DataTable'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { attendanceImportService } from '@/services/attendance/attendance-import.service'
import { attendanceReportService } from '@/services/attendance/attendance-report.service'
import { nationalHolidayService } from '@/services/attendance/national-holiday.service'
import { toast } from '@/lib/toast' 
import { Upload, FileDown, CheckCircle2, AlertCircle, Calendar, Info } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

export default function AttendanceImport() {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [holidays, setHolidays] = useState<any[]>([])
  const { 
    file, previewData, importResult, 
    setUploadData, setImportResult, clearUploadData 
  } = useAttendanceStore()
  
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadHolidays()
  }, [selectedYear])

  const loadHolidays = async () => {
    try {
      const data = await nationalHolidayService.getHolidays(Number(selectedYear))
      setHolidays(data)
    } catch (error) {
      console.error('Failed to load holidays')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      generatePreview(selectedFile)
    }
  }

  const generatePreview = async (selectedFile: File) => {
    const buffer = await selectedFile.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet).slice(0, 5) // Preview 5 rows
    setUploadData(selectedFile, data)
  }

  const handleImport = async () => {
    if (!file) return
    
    setIsProcessing(true)
    try {
      const result = await attendanceImportService.processImport(
        file,
        Number(selectedMonth),
        Number(selectedYear),
        null // User ID from auth would go here
      )
      setImportResult(result)
      clearUploadData() // Clear state on successful import
      toast.success('Import Berhasil!')
    } catch (error: any) {
      toast.error(`Import Gagal: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    try {
      const { wb, fileName } = await attendanceReportService.generateMonthlyReport(
        Number(selectedMonth),
        Number(selectedYear)
      )
      XLSX.writeFile(wb, fileName)
      toast.success('Report Berhasil di-export')
    } catch (error) {
      toast.error('Gagal export report')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Import Data Fingerprint" 
        subtitle="Kelola absensi karyawan dari file Excel mesin fingerprint"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Configuration */}
        <Card className="glass-morphism border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              1. Pilih Periode
            </CardTitle>
            <CardDescription>Tentukan bulan dan tahun absensi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Hari Libur</div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {holidays.length > 0 ? (
                  holidays.filter(h => h.date.startsWith(selectedYear)).map(h => (
                    <div key={h.id} className="text-xs bg-muted/50 p-2 rounded flex justify-between">
                      <span>{h.name}</span>
                      <span className="text-muted-foreground">{h.date}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">Memuat data libur...</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload */}
        <Card className="glass-morphism border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              2. Upload File
            </CardTitle>
            <CardDescription>Format .xlsx atau .xls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">
                  {file ? file.name : 'Pilih file atau seret ke sini'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Maksimal 10MB
                </div>
              </div>
            </div>

            {previewData.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Preview Data</div>
                <div className="text-[10px] overflow-hidden rounded border border-border bg-background/50">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        {Object.keys(previewData[0]).map(k => <th key={k} className="p-1 text-left">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {Object.values(row).map((v: any, j) => <td key={j} className="p-1 truncate max-w-[80px]">{String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Summary & Action */}
        <Card className="glass-morphism border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              3. Proses & Export
            </CardTitle>
            <CardDescription>Simpan ke database dan generate laporan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {importResult ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-xs text-green-600 font-medium">Valid</div>
                  <div className="text-2xl font-bold text-green-700">{importResult.summary.valid}</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-xs text-red-600 font-medium">Invalid</div>
                  <div className="text-2xl font-bold text-red-700">{importResult.summary.invalid}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-blue-600 font-medium">Matched</div>
                  <div className="text-2xl font-bold text-blue-700">{importResult.summary.matched}</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="text-xs text-orange-600 font-medium">Unmatched</div>
                  <div className="text-2xl font-bold text-orange-700">{importResult.summary.unmatched}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Info className="w-8 h-8 opacity-20" />
                <p className="text-sm">Belum ada data di-import</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleImport} 
                disabled={!file || isProcessing}
                className="w-full h-12 font-semibold shadow-lg shadow-primary/20"
              >
                {isProcessing ? <LoadingSpinner /> : 'Import Sekarang'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="w-full h-12 gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export Rekap Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
