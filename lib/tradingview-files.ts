export const maxTradingViewFileSize = 25 * 1024 * 1024

export function selectTradingViewFiles<T extends { name: string; size: number }>(
  files: T[],
) {
  if (files.length < 1 || files.length > 2) {
    throw new Error("Select one CSV, with an optional matching XLSX.")
  }

  const csvFiles = files.filter(({ name }) => name.toLowerCase().endsWith(".csv"))
  const reportFiles = files.filter(({ name }) => name.toLowerCase().endsWith(".xlsx"))

  if (csvFiles.length !== 1 || csvFiles.length + reportFiles.length !== files.length) {
    throw new Error("Select one CSV, with an optional matching XLSX.")
  }
  if (reportFiles.length > 1) {
    throw new Error("Only one XLSX can be attached to the session.")
  }
  if (files.some(({ size }) => size > maxTradingViewFileSize)) {
    throw new Error("Each file must be smaller than 25 MB.")
  }

  return { csv: csvFiles[0], report: reportFiles[0] ?? null }
}
