import ExcelJS from 'exceljs';
import type { JdBatchStatResult } from './batchStatBuilder';

/**
 * 京东 - 批量导出 Excel 渲染
 *
 * 每家店一个 Excel，含 3 个 Sheet，对应「费用统计」弹窗里的 3 张表：
 *   Sheet 1「京东余额对账」   —— 单行 6 列
 *   Sheet 2「钱包支出分类统计」 —— 1 行，每个 remarkCategory 一列
 *   Sheet 3「账单收支计算列表」 —— 每 billDate 一行，每 businessDesc 一列 + 总计列，末尾附总计行
 */

const HEADER_BG_ARGB = 'FFF0F0F0';
const CHECK_PASSED_ARGB = 'FF52C41A';
const CHECK_FAILED_ARGB = 'FFFF4D4F';

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    bottom: { style: 'thin' },
  };
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 12 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG_ARGB } };
  cell.border = thinBorder();
}

// ===== Sheet 1：京东余额对账 =====
function renderBalanceSheet(workbook: ExcelJS.Workbook, result: JdBatchStatResult) {
  const ws = workbook.addWorksheet('京东余额对账');
  ws.columns = [
    { header: '上月余额', key: 'lastMonthBalance', width: 16 },
    { header: '期末余额', key: 'endingBalance', width: 16 },
    { header: '本月入账', key: 'currentMonthIn', width: 16 },
    { header: '本期费用', key: 'currentPeriodExpense', width: 16 },
    { header: '收款', key: 'collection', width: 16 },
    { header: '校验', key: 'checkSum', width: 16 },
  ];
  const headerRow = ws.getRow(1);
  ws.columns.forEach((col) => {
    if (col && col.key) applyHeaderStyle(headerRow.getCell(col.key as string));
  });

  const b = result.balance;
  const isBalanced = Math.abs(b.checkSum) < 0.001;

  const dataRow = ws.addRow([
    b.lastMonthBalance,
    b.endingBalance,
    b.currentMonthIn,
    b.currentPeriodExpense,
    b.collection,
    isBalanced ? 0 : b.checkSum,
  ]);
  dataRow.eachCell((cell, col) => {
    if (col <= 5) cell.numFmt = '0.00';
    cell.font = { size: 12, bold: true };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = thinBorder();
  });
  const checkCell = dataRow.getCell(6);
  checkCell.numFmt = '0.00';
  checkCell.font = {
    bold: true,
    size: 12,
    color: { argb: isBalanced ? CHECK_PASSED_ARGB : CHECK_FAILED_ARGB },
  };
}

// ===== Sheet 2：京东钱包支出分类统计 =====
function renderJd2Sheet(workbook: ExcelJS.Workbook, result: JdBatchStatResult) {
  const ws = workbook.addWorksheet('京东钱包支出分类统计');
  ws.columns = [
    { header: '备注分类', key: 'category', width: 24 },
    ...result.jd2Categories.map((cat) => ({ header: cat, key: cat, width: 22 })),
  ];
  const headerRow = ws.getRow(1);
  ws.columns.forEach((col) => {
    if (col && col.key) applyHeaderStyle(headerRow.getCell(col.key as string));
  });

  const rowData: (string | number)[] = ['支出总额（元）'];
  result.jd2Categories.forEach((cat) => {
    rowData.push(Math.round((result.pivotedJd2[0]?.[cat] ?? 0) * 100) / 100);
  });
  const dataRow = ws.addRow(rowData);
  dataRow.eachCell((cell, col) => {
    if (col === 1) {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      cell.numFmt = '0.00';
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    cell.border = thinBorder();
  });
}

// ===== Sheet 3：京东账单收支计算列表 =====
function renderJd1Sheet(workbook: ExcelJS.Workbook, result: JdBatchStatResult) {
  const ws = workbook.addWorksheet('京东账单收支计算列表');
  ws.columns = [
    { header: '账单日期', key: 'billDate', width: 16 },
    ...result.jd1Columns.map((desc) => ({ header: desc, key: desc, width: 22 })),
    { header: '总计', key: 'total', width: 16 },
  ];
  const headerRow = ws.getRow(1);
  ws.columns.forEach((col) => {
    if (col && col.key) applyHeaderStyle(headerRow.getCell(col.key as string));
  });

  // 数据行
  result.pivotedJd1.forEach((row) => {
    const values: (string | number)[] = [row.billDate];
    result.jd1Columns.forEach((desc) => {
      values.push(Math.round(((row[desc] as number) || 0) * 100) / 100);
    });
    values.push(Math.round((row.total || 0) * 100) / 100);
    const dataRow = ws.addRow(values);
    dataRow.eachCell((cell, col) => {
      if (col === 1) {
        cell.font = { size: 12 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.font = { size: 12 };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      cell.border = thinBorder();
    });
  });

  // 总计行（末行，加粗高亮）
  if (result.pivotedJd1.length > 0) {
    const summaryValues: (string | number)[] = ['总计'];
    result.jd1Columns.forEach((desc) => {
      summaryValues.push(Math.round((result.jd1SummaryRow[desc] ?? 0) * 100) / 100);
    });
    summaryValues.push(Math.round((result.jd1SummaryRow.total ?? 0) * 100) / 100);
    const sumRow = ws.addRow(summaryValues);
    sumRow.eachCell((cell, col) => {
      if (col === 1) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      cell.border = thinBorder();
    });
  }
}

/**
 * 把京东统计结果渲染成 Excel Blob
 */
export async function renderJdStatExcel(result: JdBatchStatResult): Promise<Blob> {
  const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
  workbook.creator = 'peidi-oms-ui';
  workbook.created = new Date();

  renderBalanceSheet(workbook, result);
  renderJd2Sheet(workbook, result);
  renderJd1Sheet(workbook, result);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
