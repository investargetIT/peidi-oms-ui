import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 示例数据
const newData = [
  {
    rowStatus: 'Insert',
    id: -1,
    documentType: 'SO6',
    documentNumber: '',
    date: '2025/09/30',
    customer: '2.8105',
    customerName: '【天猫】佩蒂旗舰店',
    priceIncludeTax: '',
    taxGroup: 'TS13',
    salesman: '',
    department: '',
    lineStatus: 'Insert',
    lineNumber: 10,
    item: '50201.0799',
    brand: 'SmartBones',
    productCode: 'SBC-00990CN',
    productName: '鸡肉味鸡肉粉谷蛋白夹肉迷你结骨 8支装',
    specification: '2.5-3＂,16-20g/支,本鸡肉粉鸡肉片1-1.5g/支,8支=128g/包,保质期3年',
    unitPrice: 16.5,
    quantity: 12,
    freeProductType: '',
    taxIncludedAmount: '',
    col1: 'Insert',
    planLineStatus: 10,
    subLineNumber: '',
    deliveryDate: '当前组织出货',
    supplyType: '',
  },
  {
    rowStatus: '',
    id: '',
    documentType: '',
    documentNumber: '',
    date: '',
    customer: '',
    customerName: '',
    priceIncludeTax: '',
    taxGroup: 'TS13',
    salesman: '',
    department: '',
    lineStatus: '',
    lineNumber: 20,
    item: '50303.0458',
    brand: '齿能',
    productCode: 'CN-C1-5238',
    productName: '齿能1号健齿环奶酪味7支装105g(袋装)',
    specification: '15g/支/彩袋，7彩袋/包',
    unitPrice: 65.0,
    quantity: 3,
    freeProductType: '',
    taxIncludedAmount: '',
    col1: '',
    planLineStatus: 10,
    subLineNumber: '',
    deliveryDate: '当前组织出货',
    supplyType: '',
  },
  {
    rowStatus: '',
    id: '',
    documentType: '',
    documentNumber: '',
    date: '',
    customer: '',
    customerName: '',
    priceIncludeTax: '',
    taxGroup: 'TS13',
    salesman: '',
    department: '',
    lineStatus: '',
    lineNumber: 30,
    item: '50410.0002',
    brand: 'Meatyway爵宴',
    productCode: 'MTY-YLW-01-50',
    productName: 'Meatyway爵宴源力碗全价烘焙犬粮鸡肉三文鱼配方50g',
    specification: '50g',
    unitPrice: 0,
    quantity: 5,
    freeProductType: '赠品',
    taxIncludedAmount: '',
    col1: '',
    planLineStatus: 10,
    subLineNumber: '',
    deliveryDate: '当前组织出货',
    supplyType: '',
  },
];

// 导入excel return出整个workbook
const importExcel = async () => {
  console.log('开始导入');

  const response = await fetch('/static/OBA销售模板.xlsx');

  if (!response.ok) {
    throw new Error('无法加载Excel文件');
  }
  // console.log('response', response);

  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // 使用更安全的加载选项
  await workbook.xlsx.load(arrayBuffer, {
    ignoreNodes: [], // 不忽略任何节点
  });
  // console.log('workbook', workbook);

  return workbook;
};

// 导出excel 传参workbook
const exportExcel = async (workbook: ExcelJS.Workbook) => {
  console.log('开始导出');

  // 使用更安全的写入选项
  const buffer = await workbook.xlsx.writeBuffer({
    useStyles: true,
    useSharedStrings: true,
  });

  // 生成 Excel 文件
  // const buffer = await workbook.xlsx.writeBuffer();

  // 保存文件
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `测试.xlsx`);
};

// 辅助函数：复制行格式
const copyRowFormatting = (
  worksheet: ExcelJS.Worksheet,
  sourceRowNum: number,
  targetRowNum: number,
) => {
  const sourceRow = worksheet.getRow(sourceRowNum);
  const targetRow = worksheet.getRow(targetRowNum);

  sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);

    // 复制样式
    if (cell.style) {
      targetCell.style = JSON.parse(JSON.stringify(cell.style));
    }

    // 复制数字格式
    if (cell.numFmt) {
      targetCell.numFmt = cell.numFmt;
    }

    // 复制对齐方式
    if (cell.alignment) {
      targetCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
    }

    // 复制边框
    if (cell.border) {
      targetCell.border = JSON.parse(JSON.stringify(cell.border));
    }

    // 复制字体
    if (cell.font) {
      targetCell.font = JSON.parse(JSON.stringify(cell.font));
    }
  });
};

// 业务逻辑-表单数据处理
const handleFormData = async () => {
  console.log('开始处理表单数据');

  const workbook = await importExcel();
  // console.log('业务workbook', workbook);
  const sheet = workbook.getWorksheet('销售订单');
  // console.log('业务sheet', sheet);
  if (!sheet) {
    throw new Error('工作表不存在');
  }

  let currentRow = 25;

  newData.forEach((data, index) => {
    const row = sheet.getRow(currentRow + index);

    // 设置单元格值
    row.getCell(1).value = data.rowStatus; // A列: 行状态
    row.getCell(2).value = data.id; // B列: ID
    row.getCell(3).value = data.documentType; // C列: 单据类型
    row.getCell(4).value = data.documentNumber; // D列: 单号
    row.getCell(5).value = data.date; // E列: 日期
    row.getCell(6).value = data.customer; // F列: 客户
    row.getCell(7).value = data.customerName; // G列: 客户名称
    row.getCell(8).value = data.priceIncludeTax; // H列: 价格含税
    row.getCell(9).value = data.taxGroup; // I列: 税组合
    row.getCell(10).value = data.salesman; // J列: 业务员
    row.getCell(11).value = data.department; // K列: 部门
    row.getCell(12).value = data.lineStatus; // L列: 单行.行状态
    row.getCell(13).value = data.lineNumber; // M列: 行号
    row.getCell(14).value = data.item; // N列: 料品
    row.getCell(15).value = data.brand; // O列: 品牌
    row.getCell(16).value = data.productCode; // P列: 货号
    row.getCell(17).value = data.productName; // Q列: 品名
    row.getCell(18).value = data.specification; // R列: 规格
    row.getCell(19).value = data.unitPrice; // S列: 单价
    row.getCell(20).value = data.quantity; // T列: 数量
    row.getCell(21).value = data.freeProductType; // U列: 是否赠品
    row.getCell(22).value = data.taxIncludedAmount; // V列: 销售订单行.价税合计
    row.getCell(23).value = data.col1; // W列: 列1
    row.getCell(24).value = data.planLineStatus; // X列: 计划行.行状态
    row.getCell(25).value = data.subLineNumber; // Y列: 子行号
    row.getCell(26).value = data.deliveryDate; // Z列: 交期
    row.getCell(27).value = data.supplyType; // AA列: 销售订单行_订单子行.供应类型

    // 设置单元格样式（可选，如果需要保持与前面行相同的格式）
    copyRowFormatting(sheet, 5, currentRow + index);

    row.commit();
  });

  console.log('数据插入完成');

  // 导出更新后的 Excel 文件
  exportExcel(workbook);
};

export { handleFormData };
