import ExcelJS from 'exceljs';
import type { StatResult, DetailRow } from './statBuilder';

/**
 * 行底色 ARGB（与弹窗保持一致）
 *   collection = 浅绿 #F6FFED
 *   deduction  = 浅橙 #FFF7E6
 *   withdraw   = 浅蓝 #E6F7FF
 *   校验通过   = 绿字 #52C41A
 *   校验失败   = 红字 #FF4D4F
 */
const ROW_FILL_ARGB: Record<NonNullable<DetailRow['rowColor']>, string> = {
  collection: 'FFF6FFED',
  deduction: 'FFFFF7E6',
  withdraw: 'FFE6F7FF',
};
const CHECK_PASSED_ARGB = 'FF52C41A';
const CHECK_FAILED_ARGB = 'FFFF4D4F';
const HEADER_BG_ARGB = 'FFF0F0F0';

/**
 * 把 StatResult 渲染成 Excel Blob：
 *   Sheet 1「汇总校验」 —— 1 行 11 列，对应弹窗上半张表
 *   Sheet 2「业务编码明细」 —— 多行，对应弹窗下半张表，含 rowSpan 和行底色
 *
 * 视觉上尽量还原前端 antd Table 的样子（加粗、底色、数值格式）。
 */
export async function renderStatExcel(result: StatResult): Promise<Blob> {
  const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
  workbook.creator = 'peidi-oms-ui';
  workbook.created = new Date();

  renderSummarySheet(workbook, result);
  renderDetailSheet(workbook, result);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG_ARGB } };
  cell.border = thinBorder();
}

function applyCellBorder(cell: ExcelJS.Cell) {
  cell.border = thinBorder();
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    bottom: { style: 'thin' },
  };
}

function renderSummarySheet(workbook: ExcelJS.Workbook, result: StatResult) {
  const ws = workbook.addWorksheet('汇总校验');
  ws.columns = [
    { header: '账单月份', key: 'billMonth', width: 12 },
    { header: '平台', key: 'platform', width: 10 },
    { header: '账户名称', key: 'accountName', width: 32 },
    { header: '期末余额（元）', key: 'endBalance', width: 16 },
    { header: '上月余额', key: 'lastMonthBalance', width: 14 },
    { header: '本期收款', key: 'currentCollection', width: 14 },
    { header: '本期费用', key: 'currentExpense', width: 14 },
    { header: '提现', key: 'withdraw', width: 12 },
    { header: '结息', key: 'interest', width: 10 },
    { header: '计算余额', key: 'calculatedBalance', width: 14 },
    { header: '校验', key: 'checkDiff', width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell: ExcelJS.Cell) => {
    applyHeaderStyle(cell);
  });

  const s = result.summary;
  const isBalanced = Math.abs(s.checkDiff) < 0.001;
  const dataRow = ws.addRow({
    billMonth: s.billMonth,
    platform: s.platform,
    accountName: s.accountName,
    endBalance: s.endBalance,
    lastMonthBalance: s.lastMonthBalance,
    currentCollection: s.currentCollection,
    currentExpense: s.currentExpense,
    withdraw: s.withdraw,
    interest: s.interest,
    calculatedBalance: s.calculatedBalance,
    checkDiff: isBalanced ? 0 : s.checkDiff,
  });

  dataRow.eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true };
    applyCellBorder(cell);
  });
  const numCols: Array<keyof StatResult['summary']> = [
    'endBalance',
    'lastMonthBalance',
    'currentCollection',
    'currentExpense',
    'withdraw',
    'interest',
    'calculatedBalance',
    'checkDiff',
  ];
  numCols.forEach((k) => {
    dataRow.getCell(k).numFmt = '0.00';
  });
  const checkCell = dataRow.getCell('checkDiff');
  checkCell.font = {
    bold: true,
    color: { argb: isBalanced ? CHECK_PASSED_ARGB : CHECK_FAILED_ARGB },
  };
}

function renderDetailSheet(workbook: ExcelJS.Workbook, result: StatResult) {
  const ws = workbook.addWorksheet('业务编码明细');
  ws.columns = [
    { header: '分类', key: 'feeMajorCategory', width: 14 },
    { header: '管报名称', key: 'feeCategory', width: 14 },
    { header: '收入金额合计', key: 'incomeSum', width: 16 },
    { header: '支出金额合计', key: 'expenseSum', width: 16 },
    { header: '业务编码', key: 'businessCode', width: 14 },
    { header: '业务描述', key: 'businessDesc', width: 32 },
    { header: '收入金额', key: 'totalIncome', width: 14 },
    { header: '支出金额', key: 'totalExpense', width: 14 },
    { header: '计算结果', key: 'calculate', width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell: ExcelJS.Cell) => {
    applyHeaderStyle(cell);
  });

  const { majorCount, majorFirstIndex, categoryCount, categoryFirstIndex } =
    result.detailGroupMeta;

  // ⚠️ ExcelJS 的坑 #1：如果先 mergeCells 合并一个还没 addRow 的未来行，
  // 后面再 addRow 时那一行的值会被吞掉（即使是未被合并的列）。
  // ⚠️ ExcelJS 的坑 #2：多行合并经过 save→load 之后，master cell 的 value
  // 会被清空（无论是 readFile 还是 read 浏览器 buffer 都一样）。
  // 解法：分三轮 —— ①全部 addRow；②清掉非 master 行的 value；③merge + 显式重写 master 行 value。
  const addedRows: ExcelJS.Row[] = [];
  result.detail.forEach((row: DetailRow, idx: number) => {
    const excelRow = ws.addRow({
      feeMajorCategory: row.feeMajorCategory,
      feeCategory: row.feeCategory,
      incomeSum: row.incomeSum,
      expenseSum: row.expenseSum,
      businessCode: row.businessCode,
      businessDesc: row.businessDesc,
      totalIncome: row.totalIncome,
      totalExpense: row.totalExpense,
      calculate: row.calculate,
    });
    addedRows[idx] = excelRow;
  });

  // 第二轮：清掉非 master 行的合并列 value（按 antd rowSpan 语义）
  result.detail.forEach((row: DetailRow, idx: number) => {
    const excelRow = addedRows[idx];
    if (majorFirstIndex[row.feeMajorCategory] !== idx) {
      excelRow.getCell('feeMajorCategory').value = null;
    }
    if (categoryFirstIndex[row.feeCategory] !== idx) {
      excelRow.getCell('feeCategory').value = null;
      excelRow.getCell('incomeSum').value = null;
      excelRow.getCell('expenseSum').value = null;
    }
  });

  // 第三轮：合并 + 在合并之后**显式回写** master 行的 value（绕过坑 #2）
  result.detail.forEach((row: DetailRow, idx: number) => {
    const excelRowIdx = idx + 2; // Excel 行号（1 = 表头）
    const excelRow = addedRows[idx];

    // 一级分类合并（col 1）
    if (majorFirstIndex[row.feeMajorCategory] === idx) {
      const span = majorCount[row.feeMajorCategory];
      if (span > 1) {
        ws.mergeCells(excelRowIdx, 1, excelRowIdx + span - 1, 1);
      }
      // 合并后强制重写 master 值，规避 save/load 之后被清空的 bug
      excelRow.getCell('feeMajorCategory').value = row.feeMajorCategory;
    }
    // 二级分类合并（col 2/3/4） —— 三列同步合并
    if (categoryFirstIndex[row.feeCategory] === idx) {
      const span = categoryCount[row.feeCategory];
      if (span > 1) {
        ws.mergeCells(excelRowIdx, 2, excelRowIdx + span - 1, 2);
        ws.mergeCells(excelRowIdx, 3, excelRowIdx + span - 1, 3);
        ws.mergeCells(excelRowIdx, 4, excelRowIdx + span - 1, 4);
      }
      // 合并后强制重写 master 值
      excelRow.getCell('feeCategory').value = row.feeCategory;
      excelRow.getCell('incomeSum').value = row.incomeSum;
      excelRow.getCell('expenseSum').value = row.expenseSum;
    }
  });

  // 第四轮：剩余样式（数值格式、字体加粗、底色、边框）—— 不会动 value
  result.detail.forEach((row: DetailRow, idx: number) => {
    const excelRow = addedRows[idx];

    // 数值列格式
    (['incomeSum', 'expenseSum', 'totalIncome', 'totalExpense', 'calculate'] as const).forEach(
      (k) => {
        excelRow.getCell(k).numFmt = '0.00';
      },
    );

    // 前 4 列加粗（与弹窗一致）
    excelRow.getCell('feeMajorCategory').font = { bold: true };
    excelRow.getCell('feeCategory').font = { bold: true };
    excelRow.getCell('incomeSum').font = { bold: true };
    excelRow.getCell('expenseSum').font = { bold: true };

    // 行底色（收款/扣款/提现 三色）
    if (row.rowColor) {
      const color: string = ROW_FILL_ARGB[row.rowColor];
      excelRow.eachCell((cell: ExcelJS.Cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      });
    }

    // 边框
    excelRow.eachCell((cell: ExcelJS.Cell) => {
      applyCellBorder(cell);
    });
  });
}
