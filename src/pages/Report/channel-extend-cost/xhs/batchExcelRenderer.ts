import ExcelJS from 'exceljs';
import type { XhsBatchStatResult } from './batchStatBuilder';

/**
 * 小红书 - 批量导出 Excel 渲染
 *
 * 每家店一个 Excel，含 2 个 Sheet，对应「费用统计」弹窗里的 2 张表：
 *   Sheet 1「小红书余额对账」 —— 单行 11 列（列与弹窗顶部汇总表一致）
 *   Sheet 2「小红书费用统计」 —— 分类（合并单元格）/ 管报名称 / 收入 / 支出 + 末尾「合计」行
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

// ===== Sheet 1：小红书余额对账 =====
function renderBalanceSheet(workbook: ExcelJS.Workbook, result: XhsBatchStatResult) {
  const ws = workbook.addWorksheet('小红书余额对账');
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

// ===== Sheet 2：小红书费用统计 =====
function renderDetailSheet(workbook: ExcelJS.Workbook, result: XhsBatchStatResult) {
  const ws = workbook.addWorksheet('小红书费用统计');
  ws.addRow(['分类', '管报名称', '收入', '支出']).eachCell((cell) => applyHeaderStyle(cell));

  const addedRows: ExcelJS.Row[] = [];
  result.rows.forEach((row) => {
    addedRows.push(ws.addRow([row.category, row.name, round2(row.income), round2(row.expense)]));
  });

  // 分类列合并（col 1）：合并后显式回写 master 值，规避 ExcelJS 合并丢值的坑
  result.rows.forEach((row, idx) => {
    if (result.catFirstIndex[row.category] === idx) {
      const span = result.catCount[row.category];
      const excelRowIdx = idx + 2; // Excel 行号（1 = 表头）
      if (span > 1) {
        ws.mergeCells(excelRowIdx, 1, excelRowIdx + span - 1, 1);
      }
      addedRows[idx].getCell(1).value = row.category;
    }
  });

  // 样式：管报名称加粗（与弹窗一致）；收入 > 0 绿色、支出 < 0 红色
  result.rows.forEach((row, idx) => {
    const excelRow = addedRows[idx];
    excelRow.eachCell((cell, col) => {
      cell.border = thinBorder();
      if (col === 1) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col === 2) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (col === 3 && row.income > 0) {
          cell.font = { size: 12, bold: true, color: { argb: INCOME_GREEN_ARGB } };
        } else if (col === 4 && row.expense < 0) {
          cell.font = { size: 12, bold: true, color: { argb: EXPENSE_RED_ARGB } };
        } else {
          cell.font = { size: 12, bold: true };
        }
      }
    });
  });

  // 合计行（末行，加粗 + 灰底）
  if (result.rows.length > 0) {
    const sumRow = ws.addRow([
      '合计',
      null,
      round2(result.summary.income),
      round2(result.summary.expense),
    ]);
    // 合并「合计」跨 分类 + 管报名称 两列
    const sumIdx = result.rows.length + 2;
    ws.mergeCells(sumIdx, 1, sumIdx, 2);
    sumRow.getCell(1).value = '合计';
    sumRow.eachCell((cell, col) => {
      cell.border = thinBorder();
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG_ARGB } };
      if (col <= 2) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  }
}

/**
 * 把小红书统计结果渲染成 Excel Blob
 */
export async function renderXhsStatExcel(result: XhsBatchStatResult): Promise<Blob> {
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
