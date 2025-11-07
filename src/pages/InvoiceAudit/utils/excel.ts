import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DataType as InvoiceDataType } from '@/pages/Invoice/index';

// 导入excel return出整个workbook
const importExcel = async () => {
  console.log('开始导入');

  const response = await fetch('/static/发票信息模板.xlsx');

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
const exportExcel = async (workbook: ExcelJS.Workbook, fileName: string = '发票信息') => {
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
  saveAs(blob, `${fileName}.xlsx`);
};

// 业务逻辑-表单数据处理
const handleFormData = async (formData: InvoiceDataType[], fileName?: string) => {
  console.log('开始处理表单数据');

  const workbook = await importExcel();
  const sheet = workbook.getWorksheet('发票信息');
  if (!sheet) {
    throw new Error('工作表不存在');
  }

  //#region 业务逻辑
  //从28行开始写入数据
  const currentRow = 28;
  formData.forEach((item, index) => {
    const row = sheet.getRow(index + currentRow); // 第一行是title 所以从第二行开始
    row.getCell(1).value = item.appNo;
    row.getCell(2).value = '发票种类';
    row.getCell(3).value = item.customerCode;
    row.getCell(4).value = '税号'; // D列
    // row.getCell(13).value = "备注"; // M列
    row.getCell(14).value = item.materialName;
    row.getCell(15).value = '税率';
    row.getCell(16).value = item.productCode;
    row.getCell(17).value = item.salesUnit;
    row.getCell(18).value = item.outboundQty;
    row.getCell(19).value = '单价';
    row.getCell(20).value = item.totalTaxAmount;
    row.getCell(21).value = '税收分类编码';
    row.getCell(22).value = '折扣金额';
  });
  //#endregion

  console.log('数据插入完成');

  // 导出更新后的 Excel 文件
  exportExcel(workbook, fileName);
};

export { handleFormData };
