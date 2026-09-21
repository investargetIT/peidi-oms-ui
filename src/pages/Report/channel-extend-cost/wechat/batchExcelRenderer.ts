import ExcelJS from 'exceljs';
import type { WxBatchStatResult } from './batchStatBuilder';

/**
 * 微信 - 批量导出 Excel 渲染
 *
 * 每家店一个 Excel，含 2 个 Sheet，对应「费用统计」弹窗里的 2 张表：
 *   Sheet 1「微信余额对账」 —— 单行 11 列（列与弹窗顶部汇总表一致）
 *   Sheet 2「微信费用统计」 —— 费用分类（合并）/ 分类 / 业务类型 / 收入 / 支出 + 末尾「合计」行
 */

const HEADER_BG_ARGB = 'FFF0F0F0';
const SUMMARY_BG_ARGB = 'FFFAFAFA';
const CHECK_PASSED_ARGB = 'FF52C41A';
const CHECK_FAILED_ARGB = 'FFFF4D4F';
const INCOME_GREEN_ARGB = 'FF389E0D';
const EXPENSE_RED_ARGB = 'FFCF1322';

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

// ===== Sheet 1：微信余额对账 =====
function renderBalanceSheet(workbook: ExcelJS.Workbook, result: WxBatchStatResult) {
  const ws = workbook.addWorksheet('微信余额对账');
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

// ===== Sheet 2：微信费用统计 =====
function renderDetailSheet(workbook: ExcelJS.Workbook, result: WxBatchStatResult) {
  const ws = workbook.addWorksheet('微信费用统计');
  ws.addRow(['费用分类', '分类', '业务类型', '收支类型', '金额（元）']).eachCell((cell) => applyHeaderStyle(cell));

  const addedRows: ExcelJS.Row[] = [];
  result.rows.forEach((row) => {
    addedRows.push(
      ws.addRow([row.expenseCategory, row.category, row.businessType, row.accountType, round2(row.amount)]),
    );
  });

  // 费用分类列（col 1）连续相等合并
  for (let i = 0; i < result.rows.length; ) {
    const value = result.rows[i].expenseCategory;
    let j = i;
    while (j < result.rows.length && result.rows[j].expenseCategory === value) j++;
    const count = j - i;
    if (count > 1) {
      const excelRowStart = i + 2; // Excel 行号（1 = 表头）
      ws.mergeCells(excelRowStart, 1, excelRowStart + count - 1, 1);
      addedRows[i].getCell(1).value = value;
    }
    i = j;
  }

  // 分类列（col 2）仅在 费用分类 分组内合并（跨组不跨）
  for (let start = 0; start < result.rows.length; ) {
    const exp = result.rows[start].expenseCategory;
    let end = start;
    while (end < result.rows.length && result.rows[end].expenseCategory === exp) end++;
    for (let i = start; i < end; ) {
      const cat = result.rows[i].category;
      let j = i;
      while (j < end && result.rows[j].category === cat) j++;
      const count = j - i;
      if (count > 1) {
        const excelRowStart = i + 2;
        ws.mergeCells(excelRowStart, 2, excelRowStart + count - 1, 2);
        addedRows[i].getCell(2).value = cat;
      }
      i = j;
    }
    start = end;
  }

  // 样式：费用分类加粗；收入（金额>0）绿色、支出（金额<0）红色
  result.rows.forEach((row, idx) => {
    const excelRow = addedRows[idx];
    excelRow.eachCell((cell, col) => {
      cell.border = thinBorder();
      if (col === 1) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col <= 4) {
        cell.font = { size: 12 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (row.amount > 0) {
          cell.font = { size: 12, bold: true, color: { argb: INCOME_GREEN_ARGB } };
        } else if (row.amount < 0) {
          cell.font = { size: 12, bold: true, color: { argb: EXPENSE_RED_ARGB } };
        } else {
          cell.font = { size: 12, bold: true };
        }
      }
    });
  });

  // 总计行（末行，加粗 + 灰底）：合并前 4 列标签，末列金额（带符号，净额 = 本期收款 + 本期费用）
  if (result.rows.length > 0) {
    const total = result.totalRow;
    const label = total?.businessType || '总计';
    const amount = result.summary.total;
    const sumRow = ws.addRow([label, null, null, null, round2(amount)]);
    const sumIdx = result.rows.length + 2;
    ws.mergeCells(sumIdx, 1, sumIdx, 4);
    sumRow.getCell(1).value = label;
    sumRow.eachCell((cell, col) => {
      cell.border = thinBorder();
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG_ARGB } };
      if (col <= 4) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '+0.00;-0.00'; // 带 +/- 符号
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }
}

/**
 * 把微信统计结果渲染成 Excel Blob
 */
export async function renderWxStatExcel(result: WxBatchStatResult): Promise<Blob> {
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
