import { create } from 'zustand'

interface AttendanceStore {
  file: File | null
  previewData: any[]
  importResult: any
  setUploadData: (file: File | null, previewData: any[]) => void
  setImportResult: (result: any) => void
  clearUploadData: () => void
}

export const useAttendanceStore = create<AttendanceStore>((set) => ({
  file: null,
  previewData: [],
  importResult: null,
  setUploadData: (file, previewData) => set({ file, previewData, importResult: null }),
  setImportResult: (importResult) => set({ importResult }),
  clearUploadData: () => set({ file: null, previewData: [] }),
  clearData: () => set({ file: null, previewData: [], importResult: null }),
}))
