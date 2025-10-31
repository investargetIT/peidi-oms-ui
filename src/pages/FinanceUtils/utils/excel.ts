import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { EXCEL_CONFIG } from './excelConfig';
import JSZip from 'jszip';

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
const exportExcel = async (workbook: ExcelJS.Workbook, fileName: string = '测试') => {
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

// 导出excel return blob
const exportExcelReturnBlob = async (workbook: ExcelJS.Workbook, fileName: string = '测试') => {
  console.log('开始导出blob');

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
  return { name: `${fileName}.xlsx`, blob };
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
const handleFormData = async (tableData: any[], fileName?: string) => {
  console.log('开始处理表单数据');

  const workbook = await importExcel();
  // console.log('业务workbook', workbook);
  const sheet = workbook.getWorksheet('销售订单');
  // console.log('业务sheet', sheet);
  if (!sheet) {
    throw new Error('工作表不存在');
  }

  // const formatRow = 19; // 假设第5行是格式行
  // const currentRow = 25; // 从第25行开始写入数据

  // const dataIndexList = EXCEL_CONFIG.map((item) => item.dataIndex);
  // tableData.forEach((item, index) => {
  //   const row = sheet.getRow(index + currentRow); // 第一行是title 所以从第二行开始
  //   dataIndexList.forEach((dataIndex, colIndex) => {
  //     row.getCell(colIndex + 1).value = item[dataIndex];

  //     // 设置单元格样式（可选，如果需要保持与前面行相同的格式）
  //     copyRowFormatting(sheet, formatRow, currentRow + index);

  //     row.commit();
  //   });
  // });

  console.log('数据插入完成');

  // 导出更新后的 Excel 文件
  exportExcel(workbook, fileName);
};

// 业务逻辑 -传入antd table数据 导出excel
const handleAntdTableData = async (tableData: any[], fileName?: string) => {
  console.log('开始处理Table数据');

  // 创建空的Excel工作簿
  const workbook = new ExcelJS.Workbook();
  // 在工作簿中创建工作表命名为sheet1
  const sheet = workbook.addWorksheet('sheet1');
  // 设置工作表默认缩放比例为75%
  sheet.views = [
    {
      zoomScale: 75,
    },
  ];
  // 设置工作表列宽
  EXCEL_CONFIG.forEach((item, index) => {
    sheet.getColumn(index + 1).width = 5;
  });
  // 把sheet第一行设置成EXCEL_CONFIG的title
  sheet.getRow(1).values = EXCEL_CONFIG.map((item) => item.title);
  // 遍历EXCEL_CONFIG 把dataIndex按顺序存在数组里
  const dataIndexList = EXCEL_CONFIG.map((item) => item.dataIndex);

  // 插入逻辑
  let typeStatus = false; // 单据类型状态 是否需要插入Insert
  let idTemp = -1; // id编号

  // 遍历tableData 按dataIndexList的顺序 把数据存在sheet的对应行里
  tableData.forEach((item, index) => {
    const row = sheet.getRow(index + 2); // 第一行是title 所以从第二行开始

    // 如果taxRate是空值，排除0，则设置行背景色为红色
    if (item.taxRate === null || item.taxRate === undefined) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' },
      };
    }

    // 先记录有没有单据类型
    if (item.type) {
      typeStatus = true;
    } else {
      typeStatus = false;
    }
    dataIndexList.forEach((dataIndex, colIndex) => {
      // typeStatus为true时需要插入Insert
      if (
        dataIndex === 'rowStatus' ||
        dataIndex === 'lineStatus' ||
        dataIndex === 'planLineStatus'
      ) {
        if (typeStatus) {
          row.getCell(colIndex + 1).value = 'Insert';
        }
      }
      // typeStatus为true时需要插入ID
      else if (dataIndex === 'lineId') {
        if (typeStatus) {
          row.getCell(colIndex + 1).value = idTemp--;
        }
      }
      // 如果是shopId-客户则清除前空格
      else if (dataIndex === 'shopId') {
        row.getCell(colIndex + 1).value = item[dataIndex] ? item[dataIndex].trim() : '';
      } else {
        row.getCell(colIndex + 1).value = item[dataIndex];
      }
    });
  });
  // 导出工作簿
  // exportExcel(workbook, fileName);
  // 导出工作簿 blob
  return exportExcelReturnBlob(workbook, fileName);
};

// 业务逻辑 -压缩多个blob文件并导出
const handleCompressBlobs = async (
  blobLists: { name: string; blob: Blob }[],
  zipFileName: string = 'test.zip',
) => {
  console.log('开始压缩blob文件');

  const zip = new JSZip();
  blobLists.forEach((blobItem) => {
    zip.file(blobItem.name, blobItem.blob);
  });

  zip.generateAsync({ type: 'blob' }).then((blob) => {
    saveAs(blob, zipFileName);
  });
};

// 业务逻辑 - 导出OBA数据模板Excel文件
const exportObaDataTemplateExcel = async (fileName: string = '') => {
  // const workbook = await importExcel();
  // return exportExcelReturnBlob(workbook, 'OBA销售模板');
  const response = await fetch('/static/OBA销售模板.xlsx');
  const blob = await response.blob();
  return { name: `OBA销售模板${fileName ? `-${fileName}` : ''}.xlsx`, blob };
};

export { handleFormData, handleAntdTableData, handleCompressBlobs, exportObaDataTemplateExcel };
