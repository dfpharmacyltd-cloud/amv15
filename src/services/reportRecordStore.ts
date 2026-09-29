export function saveReportRecord(reportNo: string, productName: string) {
  try {
    const existingStr = localStorage.getItem('amv_saved_reports') || '{}';
    const existing = JSON.parse(existingStr);
    existing[reportNo] = productName;
    localStorage.setItem('amv_saved_reports', JSON.stringify(existing));
  } catch(e) {}
}

export function checkReportNoExists(reportNo: string, currentProductName: string): { exists: boolean; existingProductName: string; suggestedNextNo: string } {
  try {
    const existingStr = localStorage.getItem('amv_saved_reports') || '{}';
    const existing = JSON.parse(existingStr);
    if (existing[reportNo] && existing[reportNo].toLowerCase() !== currentProductName.toLowerCase()) {
      // Find next available number, e.g., AMV-2026-001/R -> AMV-2026-002/R
      const match = reportNo.match(/(.*?)(\d+)(\D*)$/);
      let suggestedNextNo = reportNo + '-1';
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const suffix = match[3];
        let num = parseInt(numStr, 10);
        let nextNo = `${prefix}${String(num + 1).padStart(numStr.length, '0')}${suffix}`;
        while(existing[nextNo]) {
          num++;
          nextNo = `${prefix}${String(num + 1).padStart(numStr.length, '0')}${suffix}`;
        }
        suggestedNextNo = nextNo;
      }
      return { exists: true, existingProductName: existing[reportNo], suggestedNextNo };
    }
  } catch(e) {}
  return { exists: false, existingProductName: '', suggestedNextNo: '' };
}
