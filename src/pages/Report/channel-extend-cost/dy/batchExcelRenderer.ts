import ExcelJS from 'exceljs';
import type { DyBatchStatResult, DyExpenseRow } from './batchStatBuilder';
import type { FinanceDyCostStatVo } from '@/services/channelExtendCostApi';
import { dyBizDescOf, dyColumnMetaOf, sortDyRowsByCategory } from './dyFeeMapping';

/**
 * 抖音 - 批量导出 Excel 渲染
 *
 * 每家店一个 Excel，含 3 个 Sheet，对应「费用统计」弹窗里的 3 张表：
 *   Sheet 1「抖音余额对账」 —— 单行 11 列（列与弹窗顶部汇总表一致）
 *   Sheet 2「抖音汇总费用」 —— 4 列（分类 / 管报名称 / 业务描述（分类别）/ 支出金额），
 *          只含 平台费用 / 推广费用 两类的行 + 末尾「合计」行（与弹窗「汇总费用」表一致）
 *   Sheet 3「抖音费用明细」 —— 表头 2 行（动态明细列上方一组组头：费用分类），
 *          每个业务分类一行 + 末尾「合计」行，
 *          列 = 分类 + 管报名称 + 业务描述（分类别）+ 动态明细列 + 收入金额（入账）+ 支出金额（出账）
 */

const HEADER_BG_ARGB = 'FFF0F0F0';
const SUMMARY_BG_ARGB = 'FFFAFAFA';
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

// ===== Sheet 1：抖音余额对账 =====
function renderBalanceSheet(workbook: ExcelJS.Workbook, result: DyBatchStatResult) {
  const ws = workbook.addWorksheet('抖音余额对账');
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

  const b = result.balance;
  const isBalanced = Math.abs(b.checkDiff) < 0.001;
  const values = [
    b.billMonth,
    b.platform,
    b.accountName,
    round2(b.endBalance),
    round2(b.lastMonthBalance),
    round2(b.currentCollection),
    round2(b.currentExpense),
    round2(b.withdraw),
    round2(b.interest),
    round2(b.calculatedBalance),
    isBalanced ? 0 : round2(b.checkDiff),
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

// ===== Sheet 2：抖音汇总费用 =====
function renderExpenseSummarySheet(workbook: ExcelJS.Workbook, result: DyBatchStatResult) {
  const ws = workbook.addWorksheet('抖音汇总费用');
  const headers = ['分类', '管报名称', '业务描述（分类别）', '支出金额'];
  ws.addRow(headers).eachCell((cell) => applyHeaderStyle(cell));

  const rows = result.expenseSummaryRows;

  // 「分类 / 管报名称」rowSpan（与弹窗 dyExpenseRowSpans 同口径）：
  // 排序后按相邻同值分段，段首 rowSpan = 段长、其余 0；管报名称要求分类也相同
  const buildSpans = (getVal: (r: DyExpenseRow) => string): number[] => {
    const spans: number[] = rows.map(() => 0);
    let start = 0;
    while (start < rows.length) {
      let end = start + 1;
      while (end < rows.length && getVal(rows[end]) === getVal(rows[start])) end++;
      spans[start] = end - start;
      start = end;
    }
    return spans;
  };
  const categorySpans = buildSpans((r) => r.category);
  const mgmtNameSpans = buildSpans((r) => `${r.category}|${r.mgmtName}`);

  const addedRows: ExcelJS.Row[] = [];
  rows.forEach((row) => {
    const values: (string | number)[] = [row.category, row.mgmtName, row.desc, round2(row.amount)];
    addedRows.push(ws.addRow(values));
  });

  // 合并前清掉非 master 行的合并列值（col 1 分类 / col 2 管报名称）
  rows.forEach((_, idx) => {
    if (categorySpans[idx] === 0) addedRows[idx].getCell(1).value = null;
    if (mgmtNameSpans[idx] === 0) addedRows[idx].getCell(2).value = null;
  });

  // 合并 + 回写 master 值（规避 ExcelJS 合并丢值的坑）
  rows.forEach((_, idx) => {
    const excelRowIdx = idx + 2; // 1 行表头 => 数据从第 2 行起
    if (categorySpans[idx] > 1) {
      ws.mergeCells(excelRowIdx, 1, excelRowIdx + categorySpans[idx] - 1, 1);
    }
    if (categorySpans[idx] >= 1) addedRows[idx].getCell(1).value = rows[idx].category;
    if (mgmtNameSpans[idx] > 1) {
      ws.mergeCells(excelRowIdx, 2, excelRowIdx + mgmtNameSpans[idx] - 1, 2);
    }
    if (mgmtNameSpans[idx] >= 1) addedRows[idx].getCell(2).value = rows[idx].mgmtName;
  });

  // 样式
  rows.forEach((_, idx) => {
    const dataRow = addedRows[idx];
    dataRow.eachCell((cell, col) => {
      if (col === 1) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col <= 3) {
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

  // 合计行（末行，加粗 + 灰底，口径与弹窗「汇总费用」表 summary 一致：
  // 合计 = 本表各行支出金额之和，只含 平台费用 / 推广费用）
  if (rows.length > 0) {
    const total = rows.reduce((acc, r) => acc + (typeof r.amount === 'number' ? r.amount : 0), 0);
    const sumValues: (string | number)[] = ['', '', '合计', round2(total)];
    const sumRow = ws.addRow(sumValues);
    sumRow.eachCell((cell, col) => {
      if (col <= 3) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG_ARGB } };
      cell.border = thinBorder();
    });
  }
}

// ===== Sheet 3：抖音费用明细 =====
function renderDetailSheet(
  workbook: ExcelJS.Workbook,
  result: DyBatchStatResult,
  data: FinanceDyCostStatVo[],
) {
  const ws = workbook.addWorksheet('抖音费用明细');

  // 组头一行：每个动态明细列的费用分类（与弹窗 2 层表头一致；映射之外留空不显示）
  const groupRow1: (string | number)[] = ['/', '/', '分类'];
  result.columnNames.forEach((colName) => groupRow1.push(dyColumnMetaOf(colName).feeType));
  groupRow1.push('', '');
  ws.addRow(groupRow1).eachCell((cell) => applyHeaderStyle(cell));

  const headers = [
    '分类',
    '管报名称',
    '业务描述（分类别）',
    ...result.columnNames,
    '收入金额（入账）',
    '支出金额（出账）',
  ];
  ws.addRow(headers).eachCell((cell) => applyHeaderStyle(cell));

  const detailValueOf = (cat: FinanceDyCostStatVo, name: string): number => {
    const d = (cat.details || []).find((x) => x.name === name);
    return d && typeof d.value === 'number' ? d.value : 0;
  };

  // 行序与弹窗一致：按分类分组排序（sortDyRowsByCategory），相同 分类/管报名称 的行相邻
  const sorted = sortDyRowsByCategory(data);

  // 「分类 / 管报名称」rowSpan（与弹窗 dyRowSpans 同口径）：
  // 排序后按相邻同值分段，段首 rowSpan = 段长、其余 0；管报名称要求分类也相同
  const buildSpans = (getVal: (r: FinanceDyCostStatVo) => string): number[] => {
    const spans: number[] = sorted.map(() => 0);
    let start = 0;
    while (start < sorted.length) {
      let end = start + 1;
      while (end < sorted.length && getVal(sorted[end]) === getVal(sorted[start])) end++;
      spans[start] = end - start;
      start = end;
    }
    return spans;
  };
  const categorySpans = buildSpans((r) => dyBizDescOf(r.name).category);
  const mgmtNameSpans = buildSpans((r) => {
    const meta = dyBizDescOf(r.name);
    return `${meta.category}|${meta.mgmtName}`;
  });

  // 数据行：每个业务分类一行（口径与弹窗 dyFeeColumns 完全一致；
  // 分类 / 管报名称按 dyFeeMapping 硬编码映射，未映射兜底 其他/其他）
  const addedRows: ExcelJS.Row[] = [];
  sorted.forEach((cat) => {
    const bizMeta = dyBizDescOf(cat.name);
    const values: (string | number)[] = [bizMeta.category, bizMeta.mgmtName, cat.name || ''];
    result.columnNames.forEach((colName) => {
      if (colName === '订单净收入') {
        // 小额打款：订单净收入取首层 value（注意非 details 里的「订单净收入」值）
        if (cat.name === '小额打款') {
          values.push(round2(typeof cat.value === 'number' ? cat.value : 0));
          return;
        }
        // 纯收支分类：订单净收入 = 收入金额（入账）
        if (cat.name && result.categoryMeta.get(cat.name)?.pure) {
          values.push(round2(typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0));
          return;
        }
      }
      values.push(round2(detailValueOf(cat, colName)));
    });
    const v = typeof cat.value === 'number' ? cat.value : 0;
    values.push(round2(v > 0 ? v : 0)); // 收入金额（入账）
    values.push(round2(v < 0 ? v : 0)); // 支出金额（出账）
    addedRows.push(ws.addRow(values));
  });

  // 合并前清掉非 master 行的合并列值（col 1 分类 / col 2 管报名称）
  sorted.forEach((_, idx) => {
    if (categorySpans[idx] === 0) addedRows[idx].getCell(1).value = null;
    if (mgmtNameSpans[idx] === 0) addedRows[idx].getCell(2).value = null;
  });

  // 合并 + 回写 master 值（规避 ExcelJS 合并丢值的坑）
  sorted.forEach((_, idx) => {
    const excelRowIdx = idx + 3; // 2 行表头（组头 + 列头）=> 数据从第 3 行起
    if (categorySpans[idx] > 1) {
      ws.mergeCells(excelRowIdx, 1, excelRowIdx + categorySpans[idx] - 1, 1);
    }
    if (categorySpans[idx] >= 1) addedRows[idx].getCell(1).value = dyBizDescOf(sorted[idx].name).category;
    if (mgmtNameSpans[idx] > 1) {
      ws.mergeCells(excelRowIdx, 2, excelRowIdx + mgmtNameSpans[idx] - 1, 2);
    }
    if (mgmtNameSpans[idx] >= 1) addedRows[idx].getCell(2).value = dyBizDescOf(sorted[idx].name).mgmtName;
  });

  // 样式
  sorted.forEach((_, idx) => {
    const dataRow = addedRows[idx];
    dataRow.eachCell((cell, col) => {
      if (col === 1) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col <= 3) {
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

  // 合计行（末行，加粗 + 灰底，口径与弹窗 dyStatSummaryRow 一致）
  if (data.length > 0) {
    // 合计行：分类 / 管报名称 两列为空，「合计」落在业务描述（分类别）列
    const sumValues: (string | number)[] = ['', '', '合计'];
    result.columnNames.forEach((colName) => {
      sumValues.push(round2(result.summaryRow[colName] ?? 0));
    });
    sumValues.push(round2(result.summaryRow['收入金额'] ?? 0));
    sumValues.push(round2(result.summaryRow['支出金额'] ?? 0));
    const sumRow = ws.addRow(sumValues);
    sumRow.eachCell((cell, col) => {
      if (col <= 3) {
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.numFmt = '0.00';
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_BG_ARGB } };
      cell.border = thinBorder();
    });
  }
}

/**
 * 把抖音统计结果渲染成 Excel Blob
 */
export async function renderDyStatExcel(
  result: DyBatchStatResult,
  data: FinanceDyCostStatVo[],
): Promise<Blob> {
  const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
  workbook.creator = 'peidi-oms-ui';
  workbook.created = new Date();

  renderBalanceSheet(workbook, result);
  renderExpenseSummarySheet(workbook, result);
  renderDetailSheet(workbook, result, data);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
