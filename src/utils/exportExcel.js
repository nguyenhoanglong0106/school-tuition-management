/**
 * Export an array of plain objects to an .xlsx file and trigger a download.
 * `xlsx` is loaded on demand so it never bloats the main app bundle that
 * every visitor (including the mobile Student PWA) has to download.
 * @param {Array<object>} rows
 * @param {string} filename - without extension
 * @param {string} sheetName
 */
export async function exportToExcel(rows, filename = 'export', sheetName = 'Sheet1') {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
