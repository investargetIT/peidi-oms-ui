import { PageContainer } from '@ant-design/pro-components';
import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  message,
  Table,
  Upload,
  Space,
  Modal,
  Progress,
  Alert,
  Card,
  Typography,
} from 'antd';
import { UploadOutlined, FilePdfOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { formatOutboundPrintData } from './utils/format';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PrintTableCalculator from './components/PrintTableCalculator';
import SinglePrintPage from './components/SinglePrintPage';

const { Text, Paragraph } = Typography;

const OutboundPrint: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [currentPageData, setCurrentPageData] = useState<any>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null);

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

      // 过滤掉单据编号为空的行
      const filteredData = resultData.filter((item) => item['单据编号']);

      if (filteredData.length === 0) {
        message.warning('Excel文件中没有有效数据行');
      } else {
        setData(filteredData);
        message.success(`成功读取 ${filteredData.length} 条数据`);
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

  // 把计算好的分页数据扁平化
  const flattenPages = () => {
    const allPages: any[] = [];
    paginatedData.forEach((orderPages) => {
      const order = orderPages.order;
      const orderTotal = orderPages.orderTotal;
      const firstItem = order.dataList?.[0] || order;

      orderPages.pages.forEach((page: any) => {
        allPages.push({
          order,
          firstItem,
          pageRows: page.pageData,
          pageTotal: page.pageTotal,
          orderTotal,
          isLastPageOfOrder: page.isLastPageOfOrder,
        });
      });
    });
    return allPages;
  };

  const handleExportPDF = async () => {
    if (!isReady || paginatedData.length === 0) {
      message.warning('数据还在准备中，请稍候...');
      return;
    }

    setExporting(true);
    setExportModalVisible(true);
    setExportProgress(0);

    try {
      const allPages = flattenPages();
      if (allPages.length === 0) {
        message.error('没有可导出的内容');
        setExportModalVisible(false);
        setExporting(false);
        return;
      }

      // 210mm x 280mm 转换成 pt (1mm = 2.83465pt)
      const pageWidth = 210 * 2.83465;
      const pageHeight = 280 * 2.83465;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [pageWidth, pageHeight],
      });

      const totalPages = allPages.length;

      for (let i = 0; i < totalPages; i++) {
        // 设置当前页数据，触发渲染
        setCurrentPageData(allPages[i]);

        // 等待React渲染完成
        await new Promise((resolve) => setTimeout(resolve, 80));

        if (!renderContainerRef.current) continue;

        const pageElement = renderContainerRef.current.querySelector('.single-pdf-page');
        if (!pageElement) continue;

        // 使用 html2canvas 捕获页面
        const canvas = await html2canvas(pageElement as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1);

        if (i > 0) {
          pdf.addPage([pageWidth, pageHeight], 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);

        // 更新进度
        const progress = Math.round(((i + 1) / totalPages) * 100);
        setExportProgress(progress);

        // 每10页让UI喘口气
        if ((i + 1) % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      }

      // 清空当前页数据
      setCurrentPageData(null);

      // 下载PDF
      pdf.save('成品出库单.pdf');
      message.success('PDF导出成功');
      setExportModalVisible(false);
    } catch (error) {
      console.error('导出PDF失败:', error);
      message.error('导出PDF失败，请重试');
      setExportModalVisible(false);
    } finally {
      setExporting(false);
      setExportProgress(0);
      setCurrentPageData(null);
    }
  };

  return (
    <PageContainer>
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="使用说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text strong>📋 Excel 文件要求：</Text>
              </Paragraph>
              <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                <li>
                  必须包含名为 <Text strong>"打印内容"</Text> 的工作表（名称需完全匹配）
                </li>
                <li>
                  第一行为表头，必须包含以下 12 个列名：
                  <br />
                  <Text code>
                    单据日期、单据编号、客户、状态、货号、参考料号2、料品名称、规格、出库数量(销售单位)、销售单位、凭证显示号、立账凭证号
                  </Text>
                </li>
                <li>单据日期支持多种格式，系统会自动转换为 YYYY.MM.DD 格式</li>
                <li>单据编号为空的行将被自动过滤</li>
              </ul>

              <Paragraph style={{ marginBottom: 8 }}>
                <Text strong>⚡ 性能建议：</Text>
              </Paragraph>
              <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                <li>
                  数据量在 <Text strong>1000-2000 条</Text>时，导出速度较快（约 1-3 分钟）
                </li>
                <li>
                  数据量超过{' '}
                  <Text strong mark>
                    3000 条
                  </Text>
                  时，导出时间会显著增加（可能需要 5-10 分钟或更久）
                </li>
                <li>
                  建议将大批量数据 <Text strong>分批上传和导出</Text>，以提升体验和成功率
                </li>
                <li>导出过程中请勿关闭页面或刷新浏览器</li>
              </ul>

              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>💡 温馨提示：</Text> PDF
                导出采用逐页渲染方式，数据量越大耗时越长，请耐心等待进度条完成。
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          closable
        />
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={loading}>
            上传Excel文件
          </Button>
        </Upload>
        {data.length > 0 && <span>共 {data.length} 条数据</span>}
        <Button
          icon={<FilePdfOutlined />}
          type="primary"
          onClick={handleExportPDF}
          disabled={formattedData.length === 0 || !isReady}
          loading={exporting}
        >
          导出PDF
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

      {/* 隐藏的计算器，只用来计算分页，不渲染所有页 */}
      {formattedData.length > 0 && (
        <div style={{ display: 'none' }}>
          <PrintTableCalculator
            data={formattedData}
            onReadyChange={setIsReady}
            onPaginatedDataChange={setPaginatedData}
          />
        </div>
      )}

      {/* 隐藏的渲染容器，只在导出时使用 */}
      <div
        ref={renderContainerRef}
        style={{
          position: 'absolute',
          left: '-99999px',
          top: 0,
          width: '210mm',
          minHeight: '280mm',
          padding: '10mm',
          boxSizing: 'border-box',
          backgroundColor: 'white',
        }}
      >
        {currentPageData && <SinglePrintPage data={currentPageData} />}
      </div>

      <Modal title="正在导出PDF" open={exportModalVisible} footer={null} closable={false} centered>
        <div style={{ padding: '20px 0' }}>
          <Progress
            percent={exportProgress}
            status={exportProgress === 100 ? 'success' : 'active'}
          />
          <div style={{ marginTop: '10px', textAlign: 'center', color: '#666' }}>
            {exportProgress < 100
              ? `正在导出 ${exportProgress}%，请耐心等待...`
              : '导出完成，正在保存...'}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default OutboundPrint;
