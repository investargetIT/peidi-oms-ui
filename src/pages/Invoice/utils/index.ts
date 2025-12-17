import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import InvoiceApi from '@/services/invoiceApi';
import type { DataType } from '../index';
import type { PageParams } from '@/services/invoiceApi';
import dayjs from 'dayjs';
import { message } from 'antd';

/**
 * 导出Excel方法
 * @param searchParams 搜索参数，与getSearchStr()返回的格式一致
 * @param fileName 导出文件名，默认为"发票数据_{当前时间}"
 */
export const exportInvoiceDataToExcel = async (
  searchParams: string,
  fileName: string = `发票数据_${dayjs().format('YYYYMMDDHHmmss')}`,
) => {
  try {
    message.loading({ content: '正在导出数据，请稍候...', key: 'export', duration: 0 });

    // 1. 获取所有数据（不分页）
    const allData: DataType[] = await getAllInvoiceData(searchParams);

    if (allData.length === 0) {
      message.destroy('export');
      message.warning('没有数据可导出');
      return;
    }

    // 2. 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Peidi OMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 3. 创建工作表
    const worksheet = workbook.addWorksheet('发票数据');

    // 4. 设置列标题（与表格结构一致）
    const columns = [
      { header: '单据日期', key: 'date', width: 12 },
      { header: '单据编号', key: 'documentNumber', width: 20 },
      { header: '单据类型', key: 'documentType', width: 15 },
      { header: '客户编码', key: 'customerCode', width: 15 },
      { header: '料号', key: 'materialCode', width: 15 },
      { header: '货号', key: 'productCode', width: 15 },
      { header: '商家编码', key: 'merchantSku', width: 15 },
      { header: '料品名称', key: 'materialName', width: 20 },
      { header: '料品形态', key: 'materialForm', width: 12 },
      { header: '品牌', key: 'brandName', width: 12 },
      { header: '采购分类', key: 'procurementCategory', width: 15 },
      { header: '出库数量', key: 'outboundQty', width: 12 },
      { header: '销售单位', key: 'salesUnit', width: 10 },
      { header: '最终价', key: 'finalPrice', width: 12 },
      { header: '不含税合计', key: 'taxExcludedAmount', width: 15 },
      { header: '价税合计', key: 'totalTaxAmount', width: 15 },
      { header: '批号', key: 'batchNumber', width: 15 },
      { header: '创建人', key: 'createdBy', width: 12 },
      { header: '来源单据号', key: 'sourceDocument', width: 20 },
    ];

    // 5. 设置列定义
    worksheet.columns = columns;

    // 6. 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = {
      name: '微软雅黑',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.height = 25;

    // 7. 添加数据行
    allData.forEach((item, index) => {
      const row = worksheet.addRow({
        date: item.date,
        documentNumber: item.documentNumber,
        documentType: item.documentType,
        customerCode: item.customerCode,
        materialCode: item.materialCode,
        productCode: item.productCode,
        merchantSku: item.merchantSku,
        materialName: item.materialName,
        materialForm: item.materialForm,
        brandName: item.brandName,
        procurementCategory: item.procurementCategory,
        outboundQty: item.outboundQty,
        salesUnit: item.salesUnit,
        finalPrice: item.finalPrice,
        taxExcludedAmount: item.taxExcludedAmount,
        totalTaxAmount: item.totalTaxAmount,
        batchNumber: item.batchNumber,
        createdBy: item.createdBy,
        sourceDocument: item.sourceDocument,
      });

      // 设置数据行样式
      row.font = {
        name: '微软雅黑',
        size: 10,
      };
      row.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      row.height = 20;

      // 交替行颜色
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    // 8. 设置数字列的格式
    const numberColumns = ['outboundQty', 'finalPrice', 'taxExcludedAmount', 'totalTaxAmount'];
    numberColumns.forEach((colName) => {
      const colIndex = columns.findIndex((col) => col.key === colName) + 1;
      if (colIndex > 0) {
        for (let i = 2; i <= allData.length + 1; i++) {
          const cell = worksheet.getCell(i, colIndex);
          cell.numFmt = '#,##0.00';
        }
      }
    });

    // 9. 冻结标题行
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

    // 10. 自动调整列宽（基于内容）
    worksheet.columns.forEach((column) => {
      if (column.width) {
        const maxLength = Math.max(
          column.header ? column.header.length : 0,
          ...allData.map((item) => {
            const value = item[column.key as keyof DataType];
            return value ? value.toString().length : 0;
          }),
        );
        column.width = Math.min(Math.max(maxLength + 2, 8), 50);
      }
    });

    // 11. 导出Excel文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${fileName}.xlsx`);

    message.destroy('export');
    message.success(`导出成功，共导出 ${allData.length} 条数据`);
  } catch (error) {
    message.destroy('export');
    console.error('导出Excel失败:', error);
    message.error('导出失败，请重试');
  }
};

/**
 * 获取所有发票数据（不分页）
 * @param searchParams 搜索参数
 */
const getAllInvoiceData = async (searchParams: string): Promise<DataType[]> => {
  try {
    // 先获取第一页数据来获取总条数
    const firstPageRes = await InvoiceApi.getInvoiceNoAppPage({
      pageNo: 1,
      pageSize: 1,
      searchStr: searchParams,
    });

    if (firstPageRes.code !== 200 || !firstPageRes.data) {
      return [];
    }

    const total = firstPageRes.data.total;
    if (total === 0) {
      return [];
    }

    // 一次性获取所有数据
    const allDataRes = await InvoiceApi.getInvoiceNoAppPage({
      pageNo: 1,
      pageSize: total,
      searchStr: searchParams,
    });

    if (allDataRes.code === 200 && allDataRes.data) {
      return allDataRes.data.records || [];
    }

    return [];
  } catch (error) {
    console.error('获取发票数据失败:', error);
    return [];
  }
};

/**
 * 导出选中行的数据到Excel
 * @param selectedRows 选中的数据行
 * @param fileName 导出文件名
 */
export const exportSelectedRowsToExcel = async (
  selectedRows: DataType[],
  fileName: string = `选中发票数据_${dayjs().format('YYYYMMDDHHmmss')}`,
) => {
  if (selectedRows.length === 0) {
    message.warning('请先选择要导出的数据');
    return;
  }

  try {
    message.loading({ content: '正在导出选中数据...', key: 'exportSelected', duration: 0 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Peidi OMS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('选中发票数据');

    // 设置列标题（与表格结构一致）
    const columns = [
      { header: '单据日期', key: 'date', width: 12 },
      { header: '单据编号', key: 'documentNumber', width: 20 },
      { header: '单据类型', key: 'documentType', width: 15 },
      { header: '客户编码', key: 'customerCode', width: 15 },
      { header: '料号', key: 'materialCode', width: 15 },
      { header: '货号', key: 'productCode', width: 15 },
      { header: '商家编码', key: 'merchantSku', width: 15 },
      { header: '料品名称', key: 'materialName', width: 20 },
      { header: '料品形态', key: 'materialForm', width: 12 },
      { header: '品牌', key: 'brandName', width: 12 },
      { header: '采购分类', key: 'procurementCategory', width: 15 },
      { header: '出库数量', key: 'outboundQty', width: 12 },
      { header: '销售单位', key: 'salesUnit', width: 10 },
      { header: '最终价', key: 'finalPrice', width: 12 },
      { header: '不含税合计', key: 'taxExcludedAmount', width: 15 },
      { header: '价税合计', key: 'totalTaxAmount', width: 15 },
      { header: '批号', key: 'batchNumber', width: 15 },
      { header: '创建人', key: 'createdBy', width: 12 },
      { header: '来源单据号', key: 'sourceDocument', width: 20 },
    ];

    worksheet.columns = columns;

    // 设置标题行样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 添加数据行
    selectedRows.forEach((item, index) => {
      const row = worksheet.addRow(item);
      row.font = { name: '微软雅黑', size: 10 };
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.height = 20;

      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });

    // 设置数字格式
    const numberColumns = ['outboundQty', 'finalPrice', 'taxExcludedAmount', 'totalTaxAmount'];
    numberColumns.forEach((colName) => {
      const colIndex = columns.findIndex((col) => col.key === colName) + 1;
      if (colIndex > 0) {
        for (let i = 2; i <= selectedRows.length + 1; i++) {
          const cell = worksheet.getCell(i, colIndex);
          cell.numFmt = '#,##0.00';
        }
      }
    });

    // 自动调整列宽
    worksheet.columns.forEach((column) => {
      if (column.width) {
        const maxLength = Math.max(
          column.header ? column.header.length : 0,
          ...selectedRows.map((item) => {
            const value = item[column.key as keyof DataType];
            return value ? value.toString().length : 0;
          }),
        );
        column.width = Math.min(Math.max(maxLength + 2, 8), 50);
      }
    });

    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${fileName}.xlsx`);

    message.destroy('exportSelected');
    message.success(`导出成功，共导出 ${selectedRows.length} 条数据`);
  } catch (error) {
    message.destroy('exportSelected');
    console.error('导出选中数据失败:', error);
    message.error('导出失败，请重试');
  }
};
