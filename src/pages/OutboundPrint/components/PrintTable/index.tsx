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

const OutboundPrintTable: React.FC<{ data: any[] }> = ({ data }) => {
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

  const tableStyle = {
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '10px' }}>
            <span>立账凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '10px' }}>
            <span>凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px', fontSize: '10px' }}>
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '6px' }}>
            <span>销售单号：</span>
            <span>存储地点名称：成品仓</span>
            <span style={{ width: '100px', display: 'inline-block' }}>来源单号：</span>
          </div>
        </div>

        {/* 表格标题行 */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '5%', textAlign: 'center' }}>行号</th>
              <th style={{ ...thStyle, width: '14%', textAlign: 'center' }}>货号</th>
              <th style={{ ...thStyle, width: '35%' }}>品名</th>
              <th style={{ ...thStyle, width: '14%', textAlign: 'center' }}>规格</th>
              <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>销售(单位)</th>
              <th style={{ ...thStyle, width: '5%', textAlign: 'center' }}>库存单位</th>
              <th style={{ ...thStyle, width: '17%', textAlign: 'center' }}>69条码号</th>
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
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(rowIndex + 1) * 10}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row['货号'] || ''}</td>
                    <td style={cellStyle}>{row['料品名称'] || ''}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row['规格'] || ''}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row['出库数量(销售单位)'] || ''}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row['销售单位'] || ''}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row['参考料号2'] || ''}</td>
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
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本页小计</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>0</td>
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
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本单合计</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>0</td>
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
      return;
    }

    // 延迟测量，确保DOM已渲染
    const timer = setTimeout(() => {
      if (!measureContainerRef.current) return;

      const result: OrderPages[] = [];
      const container = measureContainerRef.current;

      // 估计一个安全的页面高度（单位px）
      const MAX_PAGE_HEIGHT = 380;

      data.forEach((order) => {
        const dataList = order.dataList || [];
        if (dataList.length === 0) return;

        const orderTotal = calculateTotal(dataList);

        // 先获取固定部分的高度
        const header = container.querySelector(`[data-order-id="${order['单据编号'] || ''}"] .measure-header`);
        const tableHeader = container.querySelector(`[data-order-id="${order['单据编号'] || ''}"] table thead`)?.parentElement;
        const subtotalRow = container.querySelector(`[data-order-id="${order['单据编号'] || ''}"] .measure-subtotal`);
        const totalRow = container.querySelector(`[data-order-id="${order['单据编号'] || ''}"] .measure-total`);
        const footer = container.querySelector(`[data-order-id="${order['单据编号'] || ''}"] .measure-footer`);

        const headerHeight = header?.getBoundingClientRect().height || 135;
        const tableHeaderHeight = tableHeader?.getBoundingClientRect().height || 30;
        const subtotalHeight = subtotalRow?.getBoundingClientRect().height || 25;
        const totalHeight = totalRow?.getBoundingClientRect().height || 25;
        const footerHeight = footer?.getBoundingClientRect().height || 40;

        // 获取每一行的高度
        const rowElements = container.querySelectorAll(`[data-order-id="${order['单据编号'] || ''}"] .measure-row`);
        const rowHeights: number[] = [];
        rowElements.forEach((el) => {
          rowHeights.push(el.getBoundingClientRect().height || 20);
        });

        // 开始分页算法
        const pages: PageData[] = [];
        let currentPageRows: any[] = [];
        let currentHeight = 0;
        let isFirstPage = true;

        dataList.forEach((row, index) => {
          const rowHeight = rowHeights[index] || 20;

          // 如果是当前页的最后一行，需要考虑是否是整个单的最后一页
          const isLastRowOfOrder = index === dataList.length - 1;

          // 先试试能不能放进去
          const newHeight = currentHeight + rowHeight;
          // 每一页都要加上本页小计和底部签名
          let estimatedTotalHeight = headerHeight + tableHeaderHeight + newHeight + subtotalHeight + footerHeight;

          // 如果是整个单的最后一页，还需要加上本单合计
          if (isLastRowOfOrder) {
            estimatedTotalHeight += totalHeight;
          }

          // 如果会超出，而且不是第一行，就换页
          if (currentPageRows.length > 0 && estimatedTotalHeight > MAX_PAGE_HEIGHT) {
            // 完成当前页
            const pageTotal = calculateTotal(currentPageRows.map((r, idx) => ({
              ...r,
              displayRowNum: (pages.reduce((sum, p) => sum + p.pageData.length, 0) + idx + 1) * 10,
            })));
            pages.push({
              pageData: currentPageRows.map((r, idx) => ({
                ...r,
                displayRowNum: (pages.reduce((sum, p) => sum + p.pageData.length, 0) + idx + 1) * 10,
              })),
              pageTotal,
              isFirstPage,
              isLastPageOfOrder: false,
            });

            // 开始新页
            currentPageRows = [row];
            currentHeight = rowHeight;
            isFirstPage = false;
          } else {
            currentPageRows.push(row);
            currentHeight += rowHeight;
          }
        });

        // 处理最后一页
        if (currentPageRows.length > 0) {
          const pageTotal = calculateTotal(currentPageRows.map((r, idx) => ({
            ...r,
            displayRowNum: (pages.reduce((sum, p) => sum + p.pageData.length, 0) + idx + 1) * 10,
          })));
          pages.push({
            pageData: currentPageRows.map((r, idx) => ({
              ...r,
              displayRowNum: (pages.reduce((sum, p) => sum + p.pageData.length, 0) + idx + 1) * 10,
            })),
            pageTotal,
            isFirstPage,
            isLastPageOfOrder: true,
          });
        }

        result.push({ order, pages, orderTotal });
      });

      setPaginatedData(result);
      setIsReady(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [JSON.stringify(data.map(d => d.dataList?.length || 0))]);

  // 渲染单个页面
  const renderPage = (
    order: any,
    page: PageData,
    pageIndex: number,
    orderTotal: number,
    isLastPage: boolean
  ) => {
    const firstItem = order.dataList?.[0] || order;

    return (
      <div key={pageIndex} style={isLastPage ? lastPageStyle : pageStyle}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '10px' }}>
            <span>立账凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '10px' }}>
            <span>凭证号</span>
            <span style={{ marginLeft: '15px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px', fontSize: '10px' }}>
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '6px' }}>
            <span>销售单号：</span>
            <span>存储地点名称：成品仓</span>
            <span style={{ width: '100px', display: 'inline-block' }}>来源单号：</span>
          </div>

          {/* 主要表格 */}
          <table style={tableStyle}>
            <thead>
              <tr style={trStyle}>
                <th style={{ ...thStyle, width: '5%', textAlign: 'center' }}>行号</th>
                <th style={{ ...thStyle, width: '14%', textAlign: 'center' }}>货号</th>
                <th style={{ ...thStyle, width: '35%' }}>品名</th>
                <th style={{ ...thStyle, width: '14%', textAlign: 'center' }}>规格</th>
                <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>销售(单位)</th>
                <th style={{ ...thStyle, width: '5%', textAlign: 'center' }}>库存单位</th>
                <th style={{ ...thStyle, width: '17%', textAlign: 'center' }}>69条码号</th>
              </tr>
            </thead>
            <tbody>
              {page.pageData.map((row: any, rowIndex: number) => (
                <tr key={rowIndex} style={trStyle}>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row.displayRowNum}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['货号'] || ''}</td>
                  <td style={cellStyle}>{row['料品名称'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['规格'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['出库数量(销售单位)'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['销售单位'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['参考料号2'] || ''}</td>
                </tr>
              ))}
              <tr style={trStyle}>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本页小计</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{page.pageTotal.toLocaleString()}</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
              {page.isLastPageOfOrder && (
                <tr style={trStyle}>
                  <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本单合计</td>
                  <td style={cellStyle}></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{orderTotal.toLocaleString()}</td>
                  <td style={cellStyle}></td>
                  <td style={cellStyle}></td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px', fontSize: '10px' }}>
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
            boxSizing: 'border-box'
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
            globalPageIndex === totalPages
          );
        })
      )}
    </div>
  );
};

export default OutboundPrintTable;
