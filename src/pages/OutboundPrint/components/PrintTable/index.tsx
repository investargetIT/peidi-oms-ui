import React, { useEffect, useRef, useState } from 'react';

interface PageData {
  pageData: any[];
  pageTotal: number;
  isFirstPage: boolean;
  isLastPageOfOrder: boolean;
}

interface OrderPages {
  order: any;
  pages: PageData[];
  orderTotal: number;
}

const OutboundPrintTable: React.FC<{ data: any[]; onReadyChange?: (ready: boolean) => void }> = ({
  data,
  onReadyChange,
}) => {
  const [paginatedData, setPaginatedData] = useState<OrderPages[]>([]);
  const [isReady, setIsReady] = useState(false);
  const measureContainerRef = useRef<HTMLDivElement>(null);

  // 基础样式
  const baseStyle = {
    fontFamily: 'SimSun, "宋体", serif',
    fontSize: '11px',
  };

  const pageStyle = {
    width: '241mm',
    minHeight: '139.5mm',
    backgroundColor: 'white',
    margin: '0 auto 5mm auto',
    padding: '8mm',
    boxSizing: 'border-box' as const,
    pageBreakAfter: 'always' as const,
  };

  const lastPageStyle = {
    ...pageStyle,
    pageBreakAfter: 'auto' as const,
  };

  const tableStyle: any = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
    marginTop: '8px',
    tableLayout: 'fixed',
  };

  const cellStyle = {
    border: '1px dashed #999',
    padding: '4px',
    textAlign: 'left' as const,
    overflow: 'hidden',
    wordWrap: 'break-word' as const,
    wordBreak: 'break-all' as const,
  };

  // 不换行的单元格样式（用于行号、69条码等需要完整显示的列）
  const nowrapCellStyle = {
    border: '1px dashed #999',
    padding: '4px',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
  };

  const trStyle = {
    pageBreakInside: 'avoid' as const,
  };

  const thStyle = {
    ...cellStyle,
    fontWeight: 'normal',
    backgroundColor: '#f0f0f0',
  };

  // 计算总和
  const calculateTotal = (items: any[]) => {
    return items.reduce((sum: number, item: any) => {
      const qty = parseFloat(item['出库数量(销售单位)']) || 0;
      return sum + qty;
    }, 0);
  };

  // 第一步：渲染测量内容
  const renderMeasureContent = (order: any) => {
    const dataList = order.dataList || [];
    const firstItem = dataList[0] || order;

    return (
      <div key={order['单据编号'] || 'order'} data-order-id={order['单据编号'] || ''}>
        {/* 每一页的固定内容高度测量 */}
        <div className="measure-header">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '3px' }}>
              佩蒂智创（杭州）宠物科技有限公司
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
              成品出库单
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '3px',
              fontSize: '10px',
            }}
          >
            <span>立账凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '3px',
              fontSize: '10px',
            }}
          >
            <span>凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '6px',
              fontSize: '10px',
            }}
          >
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              marginBottom: '3px',
            }}
          >
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              marginBottom: '6px',
            }}
          >
            <span>销售单号：</span>
            <span>存储地点名称：成品仓</span>
            <span style={{ width: '100px', display: 'inline-block' }}>来源单号：</span>
          </div>
        </div>

        {/* 表格标题行 */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '7%' }}>行号</th>
              <th style={{ ...thStyle, width: '18%' }}>货号</th>
              <th style={{ ...thStyle, width: '23%' }}>品名</th>
              <th style={{ ...thStyle, width: '12%' }}>规格</th>
              <th style={{ ...thStyle, width: '8%' }}>销售(单位)</th>
              <th style={{ ...thStyle, width: '9%' }}>库存单位</th>
              <th style={{ ...thStyle, width: '23%' }}>69条码号</th>
            </tr>
          </thead>
        </table>

        {/* 每一行数据的测量 */}
        <div className="measure-rows" style={{ display: 'none' }}>
          {dataList.map((row: any, rowIndex: number) => (
            <div key={rowIndex} className="measure-row" data-row-index={rowIndex}>
              <table style={tableStyle}>
                <tbody>
                  <tr>
                    <td style={nowrapCellStyle}>{(rowIndex + 1) * 10}</td>
                    <td style={cellStyle}>{row['货号'] || ''}</td>
                    <td style={cellStyle}>{row['料品名称'] || ''}</td>
                    <td style={cellStyle}>{row['规格'] || ''}</td>
                    <td style={cellStyle}>
                      {row['出库数量(销售单位)'] || ''}
                    </td>
                    <td style={cellStyle}>{row['销售单位'] || ''}</td>
                    <td style={nowrapCellStyle}>{row['参考料号2'] || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* 本页小计行 */}
        <div className="measure-subtotal" style={{ display: 'none' }}>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>
                  本页小计
                </td>
                <td style={cellStyle}></td>
                <td style={cellStyle}>0</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 本单合计行 */}
        <div className="measure-total" style={{ display: 'none' }}>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>
                  本单合计
                </td>
                <td style={cellStyle}></td>
                <td style={cellStyle}>0</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 底部签名 */}
        <div className="measure-footer" style={{ marginTop: '12px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ width: '30%', display: 'inline-block' }}>业务员：</span>
            <span style={{ width: '30%', display: 'inline-block' }}>库管员：</span>
            <span style={{ display: 'inline-block' }}>地址及备注：</span>
          </div>
        </div>
      </div>
    );
  };

  // 执行测量
  useEffect(() => {
    if (data.length === 0) {
      setIsReady(true);
      onReadyChange?.(true);
      return;
    }

    // 延迟测量，确保DOM已渲染
    const timer = setTimeout(() => {
      if (!measureContainerRef.current) return;

      const measureElements = measureContainerRef.current.querySelectorAll('[data-order-id]');
      const result: OrderPages[] = [];

      measureElements.forEach((orderElement) => {
        const orderId = orderElement.getAttribute('data-order-id') || '';
        const order = data.find((o) => o['单据编号'] === orderId);

        if (!order || !order.dataList) return;

        const headerHeight = orderElement.querySelector('.measure-header')?.clientHeight || 0;
        const footerHeight = orderElement.querySelector('.measure-footer')?.clientHeight || 0;
        const thHeight = orderElement.querySelector('thead')?.clientHeight || 0;
        const subtotalHeight = orderElement.querySelector('.measure-subtotal')?.clientHeight || 0;
        const totalHeight = orderElement.querySelector('.measure-total')?.clientHeight || 0;

        const availableHeight = 139.5 * 3.7795275591 - headerHeight - footerHeight - thHeight;

        const rows = orderElement.querySelectorAll('.measure-row');
        const pages: PageData[] = [];
        let currentPageRows: any[] = [];
        let currentHeight = 0;
        let pageTotal = 0;
        let isFirstPage = true;
        let globalRowIndex = 0;

        rows.forEach((rowElement, index) => {
          const rowHeight = rowElement.clientHeight || 30;
          const rowData = order.dataList[index];

          if (currentHeight + rowHeight > availableHeight && currentPageRows.length > 0) {
            pages.push({
              pageData: currentPageRows.map((r, idx) => ({
                ...r.data,
                displayRowNum: (globalRowIndex + idx + 1) * 10,
              })),
              pageTotal,
              isFirstPage,
              isLastPageOfOrder: false,
            });

            globalRowIndex += currentPageRows.length;
            currentPageRows = [];
            currentHeight = 0;
            pageTotal = 0;
            isFirstPage = false;
          }

          currentPageRows.push({ data: rowData, height: rowHeight });
          currentHeight += rowHeight;
          pageTotal += parseFloat(rowData['出库数量(销售单位)']) || 0;
        });

        if (currentPageRows.length > 0) {
          pages.push({
            pageData: currentPageRows.map((r, idx) => ({
              ...r.data,
              displayRowNum: (globalRowIndex + idx + 1) * 10,
            })),
            pageTotal,
            isFirstPage,
            isLastPageOfOrder: true,
          });
        }

        const orderTotal = calculateTotal(order.dataList);

        result.push({
          order,
          pages,
          orderTotal,
        });
      });

      setPaginatedData(result);
      setIsReady(true);
      onReadyChange?.(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [JSON.stringify(data.map((d) => d.dataList?.length || 0))]);

  // 渲染单个页面
  const renderPage = (
    order: any,
    page: PageData,
    pageIndex: number,
    orderTotal: number,
    isLastPage: boolean,
  ) => {
    const firstItem = order.dataList?.[0] || order;

    return (
      <div key={pageIndex} className="pdf-page" style={isLastPage ? lastPageStyle : pageStyle}>
        <div style={baseStyle}>
          {/* 每一页都显示完整标题 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '3px' }}>
              佩蒂智创（杭州）宠物科技有限公司
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
              成品出库单
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '3px',
              fontSize: '10px',
            }}
          >
            <span>立账凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '3px',
              fontSize: '10px',
            }}
          >
            <span>凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '6px',
              fontSize: '10px',
            }}
          >
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              marginBottom: '3px',
            }}
          >
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              marginBottom: '6px',
            }}
          >
            <span>销售单号：</span>
            <span>存储地点名称：成品仓</span>
            <span style={{ width: '100px', display: 'inline-block' }}>来源单号：</span>
          </div>

          {/* 主要表格 */}
          <table style={tableStyle}>
            <thead>
              <tr style={trStyle}>
                <th style={{ ...thStyle, width: '12%' }}>行号</th>
                <th style={{ ...thStyle, width: '11%' }}>货号</th>
                <th style={{ ...thStyle, width: '23%' }}>品名</th>
                <th style={{ ...thStyle, width: '12%' }}>规格</th>
                <th style={{ ...thStyle, width: '8%' }}>销售(单位)</th>
                <th style={{ ...thStyle, width: '9%' }}>库存单位</th>
                <th style={{ ...thStyle, width: '25%' }}>69条码号</th>
              </tr>
            </thead>
            <tbody>
              {page.pageData.map((row: any, rowIndex: number) => (
                <tr key={rowIndex} style={trStyle}>
                  <td style={nowrapCellStyle}>{row.displayRowNum}</td>
                  <td style={cellStyle}>{row['货号'] || ''}</td>
                  <td style={cellStyle}>{row['料品名称'] || ''}</td>
                  <td style={cellStyle}>{row['规格'] || ''}</td>
                  <td style={cellStyle}>
                    {row['出库数量(销售单位)'] || ''}
                  </td>
                  <td style={cellStyle}>{row['销售单位'] || ''}</td>
                  <td style={smallFontCellStyle}>{row['参考料号2'] || ''}</td>
                </tr>
              ))}
              <tr style={trStyle}>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>
                  本页小计
                </td>
                <td style={cellStyle}></td>
                <td style={cellStyle}>
                  {page.pageTotal.toLocaleString()}
                </td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
              {page.isLastPageOfOrder && (
                <tr style={trStyle}>
                  <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>
                    本单合计
                  </td>
                  <td style={cellStyle}></td>
                  <td style={cellStyle}>
                    {orderTotal.toLocaleString()}
                  </td>
                  <td style={cellStyle}></td>
                  <td style={cellStyle}></td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginTop: '12px',
              fontSize: '10px',
            }}
          >
            <span style={{ width: '30%', display: 'inline-block' }}>业务员：</span>
            <span style={{ width: '30%', display: 'inline-block' }}>库管员：</span>
            <span style={{ display: 'inline-block' }}>地址及备注：</span>
          </div>
        </div>
      </div>
    );
  };

  // 测量阶段渲染
  if (!isReady) {
    return (
      <div id="printJS-form">
        <div
          ref={measureContainerRef}
          style={{
            position: 'absolute',
            left: '-99999px',
            top: '0',
            width: '241mm',
            padding: '8mm',
            boxSizing: 'border-box',
          }}
        >
          {data.map(renderMeasureContent)}
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>正在绘制打印内容...</div>
      </div>
    );
  }

  // 最终渲染
  let globalPageIndex = 0;
  const totalPages = paginatedData.reduce((sum, o) => sum + o.pages.length, 0);

  return (
    <div id="printJS-form">
      {/* 保留隐藏的测量容器，避免重新渲染丢失 */}
      <div style={{ display: 'none' }} ref={measureContainerRef} />

      {paginatedData.map((orderPages) =>
        orderPages.pages.map((page, pageIdx) => {
          globalPageIndex++;
          return renderPage(
            orderPages.order,
            page,
            globalPageIndex - 1,
            orderPages.orderTotal,
            globalPageIndex === totalPages,
          );
        }),
      )}
    </div>
  );
};

export default OutboundPrintTable;
