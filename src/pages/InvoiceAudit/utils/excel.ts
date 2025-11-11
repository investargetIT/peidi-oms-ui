import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DataType as InvoiceDataType } from '@/pages/Invoice/index';
import type { DataType as InvoiceCustomerInfo } from '@/pages/CustomerInfo/index';

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

// 业务逻辑辅助方法 -根据客户编码获取客户信息
const getCustomerInfoByCode = (
  customerCode: string,
  customerInfo?: InvoiceCustomerInfo[],
): InvoiceCustomerInfo | undefined => {
  return customerInfo?.find((item) => item.customerName === customerCode);
};
// 业务逻辑辅助方法 -在taxInfo根据料号获取开票税务信息
const getTaxInfoByU9No = (u9No: string, taxInfo?: any[]): any | undefined => {
  return taxInfo?.find((item) => item.u9No === u9No);
};

// 业务逻辑-表单数据处理
const handleFormData = async (
  formData: InvoiceDataType[],
  customerInfo: InvoiceCustomerInfo[],
  taxInfo: any[],
  fileName?: string,
) => {
  console.log('开始处理表单数据', formData, customerInfo);

  const workbook = await importExcel();
  const sheet = workbook.getWorksheet('发票信息');
  if (!sheet) {
    throw new Error('工作表不存在');
  }

  //#region 业务逻辑
  //从28行开始写入数据
  const currentRow = 4;
  formData.forEach((item, index) => {
    const customerInfoItem = getCustomerInfoByCode(item.customerCode, customerInfo);
    console.log('customerInfoItem', customerInfoItem);
    const taxInfoItem = getTaxInfoByU9No(item.materialCode, taxInfo);
    console.log('taxInfoItem', taxInfoItem);
    const row = sheet.getRow(index + currentRow); // 第一行是title 所以从第二行开始
    row.getCell('A').value = item.appNo;
    row.getCell('B').value = customerInfoItem?.type || '';
    row.getCell('C').value = item.customerCode;
    row.getCell('D').value = customerInfoItem?.tax || ''; // D列
    row.getCell('M').value = item.documentNumber; // M列
    row.getCell('N').value = item.materialName;
    //做个防呆
    row.getCell('O').value =
      taxInfoItem?.taxRate && taxInfoItem?.taxRate > 0 ? taxInfoItem?.taxRate / 100 : '';
    row.getCell('P').value = item.productCode;
    row.getCell('Q').value = item.salesUnit;
    row.getCell('R').value = item.outboundQty;
    // row.getCell('S').value = '单价';
    row.getCell('T').value = item.totalTaxAmount;
    row.getCell('V').value = taxInfoItem?.taxNo || '';
    // row.getCell('AA').value = '折扣金额';
  });
  //#endregion

  console.log('数据插入完成');

  // 导出更新后的 Excel 文件
  exportExcel(workbook, fileName);
};

export { handleFormData };
