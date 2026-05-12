import { PageContainer } from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import { Button, message, Table, Upload, Space } from 'antd';
import { UploadOutlined, PrinterOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { formatOutboundPrintData } from './utils/format';
import printJS from 'print-js';
import OutboundPrintTable from './components/PrintTable';

const OutboundPrint: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formattedData, setFormattedData] = useState<any[]>([]);

  const requiredColumns = [
    '单据日期',
    '单据编号',
    '客户',
    '状态',
    '货号',
    '参考料号2',
    '料品名称',
    '规格',
    '出库数量(销售单位)',
    '销售单位',
    '凭证显示号',
    '立账凭证号',
  ];

  const handleFileUpload: UploadProps['beforeUpload'] = async (file) => {
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets.find((sheet) => sheet.name === '打印内容');

      if (!worksheet) {
        message.error('没找到名称为"打印内容"的工作表');
        setLoading(false);
        return false;
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });

      const columnIndices = requiredColumns.map((col) => headers.indexOf(col));

      const invalidColumns = requiredColumns.filter((col, index) => columnIndices[index] === -1);
      if (invalidColumns.length > 0) {
        message.error(`缺少以下列: ${invalidColumns.join(', ')}`);
        setLoading(false);
        return false;
      }

      const resultData: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const obj: any = {};
        requiredColumns.forEach((col, index) => {
          const cellValue = row.getCell(columnIndices[index] + 1).value;

          if (col === '单据日期' && cellValue) {
            let dateValue: any = cellValue;

            if (cellValue instanceof Date) {
              dateValue = dayjs(cellValue).format('YYYY.MM.DD');
            } else if (typeof cellValue === 'number') {
              const date = new Date((cellValue - 25569) * 86400 * 1000);
              dateValue = dayjs(date).format('YYYY.MM.DD');
            } else {
              const parsedDate = dayjs(cellValue.toString());
              if (parsedDate.isValid()) {
                dateValue = parsedDate.format('YYYY.MM.DD');
              } else {
                dateValue = cellValue.toString();
              }
            }

            obj[col] = dateValue;
          } else {
            obj[col] = cellValue ? cellValue.toString() : '';
          }
        });
        resultData.push(obj);
      });

      if (resultData.length === 0) {
        message.warning('Excel文件中没有数据行');
      } else {
        setData(resultData);
        message.success(`成功读取 ${resultData.length} 条数据`);
      }
    } catch (error) {
      console.error(error);
      message.error('文件解析失败，请检查文件格式');
    } finally {
      setLoading(false);
    }

    return false;
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: handleFileUpload,
  };

  const columns = requiredColumns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
    width: 150,
    ellipsis: true,
  }));

  const handleFormatData = () => {
    const formattedDataTemp = formatOutboundPrintData(data);
    setFormattedData(formattedDataTemp);
  };
  useEffect(() => {
    handleFormatData();
  }, [data]);

  const handlePrint = () => {
    const printContent = document.getElementById('printJS-form');
    if (!printContent) return;

    // 创建隐藏的iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);

    // 构建完整的打印HTML，包含所有必要的样式
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>成品出库单</title>
        <style>
          @page {
            size: 241mm 139.5mm;
            margin: 0;
          }
          body {
            font-family: SimSun, "宋体", serif;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 10px;
            table-layout: fixed;
          }
          th, td {
            border: 1px dashed #999;
            padding: 4px;
            text-align: left;
            overflow: hidden;
            word-wrap: break-word;
            word-break: break-all;
          }
           th {
            font-weight: normal;
            background-color: #f0f0f0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
      </html>
    `;

    // 写入iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // 等待内容加载完成后打印
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // 打印完成后移除iframe
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
    }
  };
  return (
    <PageContainer>
      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={loading}>
            上传Excel文件
          </Button>
        </Upload>
        {data.length > 0 && <span>共 {data.length} 条数据</span>}
        <Button
          icon={<PrinterOutlined />}
          type="primary"
          onClick={handlePrint}
          disabled={formattedData.length === 0}
        >
          打印
        </Button>
      </Space>

      {false && data.length > 0 && (
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(record, index) => `${index}`}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      )}

      {formattedData.length > 0 && (
        <div style={{ height: '60vh', overflow: 'auto' }}>
          <OutboundPrintTable data={formattedData} />
        </div>
      )}
    </PageContainer>
  );
};

export default OutboundPrint;
