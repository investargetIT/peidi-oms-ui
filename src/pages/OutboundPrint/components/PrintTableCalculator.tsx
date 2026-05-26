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

interface PrintTableCalculatorProps {
  data: any[];
  onReadyChange?: (ready: boolean) => void;
  onPaginatedDataChange?: (data: OrderPages[]) => void;
}

const PrintTableCalculator: React.FC<PrintTableCalculatorProps> = ({
  data,
  onReadyChange,
  onPaginatedDataChange,
}) => {
  const measureContainerRef = useRef<HTMLDivElement>(null);

  // 计算总和
  const calculateTotal = (items: any[]) => {
    return items.reduce((sum: number, item: any) => {
      const qty = parseFloat(item['出库数量(销售单位)']) || 0;
      return sum + qty;
    }, 0);
  };

  // 渲染测量内容（很轻量，只渲染一个订单的测量框架）
  const renderMeasureContent = (order: any) => {
    const dataList = order.dataList || [];
    const firstItem = dataList[0] || order;

    return (
      <div key={order['单据编号'] || 'order'} data-order-id={order['单据编号'] || ''}>
        {/* 每一页的固定内容高度测量 */}
        <div className="measure-header" style={{ fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
              佩蒂智创（杭州）宠物科技有限公司
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              成品出库单
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '5px',
              fontSize: '12px',
            }}
          >
            <span>立账凭证号</span>
            <span style={{ marginLeft: '20px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '5px',
              fontSize: '12px',
            }}
          >
            <span>凭证号</span>
            <span style={{ marginLeft: '20px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '10px',
              fontSize: '12px',
            }}
          >
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              fontSize: '12px',
              marginBottom: '10px',
            }}
          >
            <span style={{ width: '30%' }}>销售单号：</span>
            <span style={{ width: '40%', textAlign: 'center' }}>存储地点名称：成品仓</span>
            <span>来源单号：</span>
          </div>
        </div>

        {/* 表格标题行 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
          <thead>
            <tr>
              <th
                style={{
                  width: '5%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                行号
              </th>
              <th
                style={{
                  width: '15%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                货号
              </th>
              <th
                style={{
                  width: '24%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                品名
              </th>
              <th
                style={{
                  width: '24%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                规格
              </th>
              <th
                style={{
                  width: '10%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                销售(单位)
              </th>
              <th
                style={{
                  width: '7%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                库存单位
              </th>
              <th
                style={{
                  width: '15%',
                  padding: '6px',
                  border: '0.3px dashed #888',
                  backgroundColor: '#f0f0f0',
                }}
              >
                69条码号
              </th>
            </tr>
          </thead>
        </table>

        {/* 每一行数据的测量 - 只渲染一行来测量高度 */}
        <div className="measure-rows" style={{ fontSize: '12px' }}>
          {dataList.slice(0, Math.min(dataList.length, 3)).map((row: any, rowIndex: number) => (
            <div key={rowIndex} className="measure-row" data-row-index={rowIndex}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '5%', padding: '6px', border: '0.3px dashed #888' }}>
                      {(rowIndex + 1) * 10}
                    </td>
                    <td style={{ width: '15%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['货号'] || ''}
                    </td>
                    <td style={{ width: '24%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['料品名称'] || ''}
                    </td>
                    <td style={{ width: '24%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['规格'] || ''}
                    </td>
                    <td style={{ width: '10%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['出库数量(销售单位)'] || ''}
                    </td>
                    <td style={{ width: '7%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['销售单位'] || ''}
                    </td>
                    <td style={{ width: '15%', padding: '6px', border: '0.3px dashed #888' }}>
                      {row['参考料号2'] || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* 本页小计行 */}
        <div className="measure-subtotal" style={{ display: 'none', fontSize: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }} colSpan={3}>
                  本页小计
                </td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}>0</td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 本单合计行 */}
        <div className="measure-total" style={{ display: 'none', fontSize: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }} colSpan={3}>
                  本单合计
                </td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}>0</td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
                <td style={{ padding: '6px', border: '0.3px dashed #888' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 底部签名 */}
        <div className="measure-footer" style={{ marginTop: '20px', fontSize: '12px' }}>
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

        // 页面高度换算成px，减去 padding (10mm * 2)，再留更多余量
        const pageHeightPx = 297 * 3.7795275591;
        const paddingPx = 10 * 3.7795275591 * 2;
        const extraMargin = 120; // 额外留白
        const availableHeight = pageHeightPx - headerHeight - footerHeight - thHeight - subtotalHeight - totalHeight - paddingPx * 2 - extraMargin;

        // 测一行的高度
        const rowElements = orderElement.querySelectorAll('.measure-row');
        const rowHeight = rowElements.length > 0 ? rowElements[0].clientHeight || 30 : 30;

        // 估算每页行数（留更多余量）
        const rowsPerPage = Math.max(1, Math.floor(availableHeight / rowHeight) - 6);

        const dataList = order.dataList;
        const totalPages = Math.ceil(dataList.length / rowsPerPage);
        const pages: PageData[] = [];
        let globalRowIndex = 0;

        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
          const startRow = pageNum * rowsPerPage;
          const endRow = Math.min(startRow + rowsPerPage, dataList.length);
          const pageRows = dataList.slice(startRow, endRow);

          // 计算本页小计
          const pageTotal = pageRows.reduce((sum: number, row: any) => {
            return sum + (parseFloat(row['出库数量(销售单位)']) || 0);
          }, 0);

          pages.push({
            pageData: pageRows.map((r: any, idx: number) => ({
              ...r,
              displayRowNum: (globalRowIndex + idx + 1) * 10,
            })),
            pageTotal,
            isFirstPage: pageNum === 0,
            isLastPageOfOrder: pageNum === totalPages - 1,
          });

          globalRowIndex += pageRows.length;
        }

        const orderTotal = calculateTotal(order.dataList);

        result.push({
          order,
          pages,
          orderTotal,
        });
      });

      onPaginatedDataChange?.(result);
      onReadyChange?.(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [JSON.stringify(data.map((d) => d.dataList?.length || 0))]);

  return (
    <div
      ref={measureContainerRef}
      style={{
        position: 'absolute',
        left: '-99999px',
        top: 0,
        width: '210mm',
        padding: '10mm',
        boxSizing: 'border-box',
      }}
    >
      {data.map(renderMeasureContent)}
    </div>
  );
};

export default PrintTableCalculator;
