import ExcelJS from 'exceljs';
import type { ZfbBatchStatResult } from './batchStatBuilder';

/**
 * 支付宝 - 批量导出 Excel 渲染
 *
 * 每家店一个 Excel，含 2 个 Sheet，对应「费用统计」弹窗里的 2 张表：
 *   Sheet 1「支付宝余额对账」 —— 单行 11 列（列与弹窗顶部汇总表一致）
 *   Sheet 2「账单明细汇总」   —— 分类 / 对方账号 / 收入金额（元）/ 支出金额（元）+ 末尾「总计」行
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

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

// ===== Sheet 1：支付宝余额对账 =====
function renderBalanceSheet(workbook: ExcelJS.Workbook, result: ZfbBatchStatResult) {
  const ws = workbook.addWorksheet('支付宝余额对账');
  const headers = [
    '账单月份',
    '平台',
    '账户名称',
    '期末余额（元）',
    '上月余额',
    '本期收款',
    '本期费用',
    '提现',
    '结息',
    '计算余额',
    '校验',
  ];
  ws.addRow(headers).eachCell((cell) => applyHeaderStyle(cell));

  const s = result.summary;
  const isBalanced = Math.abs(s.checkDiff) < 0.001;
  const values = [
    s.billMonth,
    s.platform,
    s.accountName,
    round2(s.endBalance),
    round2(s.lastMonthBalance),
    round2(s.currentCollection),
    round2(s.currentExpense),
    round2(s.withdraw),
    round2(s.interest),
    round2(s.calculatedBalance),
    isBalanced ? 0 : round2(s.checkDiff),
  ];
  const dataRow = ws.addRow(values);
  dataRow.eachCell((cell, col) => {
    if (col >= 4) {
      cell.numFmt = '0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    cell.font = { size: 12, bold: true };
    cell.border = thinBorder();
  });
  // 校验列：平衡绿色 0.00，否则红色实际差异
  const checkCell = dataRow.getCell(11);
  checkCell.font = {
    bold: true,
    size: 12,
    color: { argb: isBalanced ? CHECK_PASSED_ARGB : CHECK_FAILED_ARGB },
  };
}

// ===== Sheet 2：账单明细汇总 =====
function renderDetailSheet(workbook: ExcelJS.Workbook, result: ZfbBatchStatResult) {
  const ws = workbook.addWorksheet('账单明细汇总');
  ws.addRow(['分类', '对方账号', '收入金额（元）', '支出金额（元）']).eachCell((cell) =>
    applyHeaderStyle(cell),
  );

  // 数据行：来自接口 rows
  result.rows.forEach((row) => {
    const dataRow = ws.addRow([
      row.category || '',
      row.accountCode || '',
      round2(row.totalIncome || 0),
      round2(row.totalExpense || 0),
    ]);
    dataRow.eachCell((cell, col) => {
      if (col <= 2) {
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

  // 总计行（末行，加粗，取接口 total）
  if (result.rows.length > 0) {
    const sumRow = ws.addRow([
      result.total?.category || '总计',
      result.total?.accountCode || '',
      round2(result.incomeTotal),
      round2(result.expenseTotal),
    ]);
    sumRow.eachCell((cell, col) => {
      if (col <= 2) {
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
 * 把支付宝统计结果渲染成 Excel Blob
 */
export async function renderZfbStatExcel(result: ZfbBatchStatResult): Promise<Blob> {
  const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
  workbook.creator = 'peidi-oms-ui';
  workbook.created = new Date();

  renderBalanceSheet(workbook, result);
  renderDetailSheet(workbook, result);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
