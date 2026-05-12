import React from 'react';

const OutboundPrintTable: React.FC<{ data: any[] }> = ({ data }) => {
  // 基础样式，同时用于屏幕显示和打印
  const baseStyle = {
    fontFamily: 'SimSun, "宋体", serif',
    fontSize: '12px',
  };

  const pageStyle = {
    width: '210mm',
    minHeight: '297mm',
    backgroundColor: 'white',
    margin: '0 auto 10mm auto',
    padding: '10mm',
    boxSizing: 'border-box' as const,
    pageBreakAfter: 'always' as const,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    marginTop: '10px',
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

  const thStyle = {
    ...cellStyle,
    fontWeight: 'normal',
    backgroundColor: '#f0f0f0',
  };

  // 渲染单个单子
  const renderOrder = (order: any, orderIndex: number) => {
    const dataList = order.dataList || [];

    // 计算本单合计
    const total = dataList.reduce((sum: number, item: any) => {
      const qty = parseFloat(item['出库数量(销售单位)']) || 0;
      return sum + qty;
    }, 0);

    // 获取第一个数据项来获取表头信息
    const firstItem = dataList[0] || order;

    return (
      <div key={orderIndex} style={pageStyle}>
        <div style={baseStyle}>
          {/* 打印标题部分 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
              佩蒂智创（杭州）宠物科技有限公司
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
              成品出库单
            </div>
          </div>

          {/* 右上角凭证信息 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px', fontSize: '12px' }}>
            <span>立账凭证号</span>
            <span style={{ marginLeft: '20px' }}>{firstItem['立账凭证号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px', fontSize: '12px' }}>
            <span>凭证号</span>
            <span style={{ marginLeft: '20px' }}>{firstItem['凭证显示号'] || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', fontSize: '12px' }}>
            <span>状态：</span>
            <span>{firstItem['状态'] || ''}</span>
          </div>

          {/* 客户信息行1 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <span>客户名称：{firstItem['客户'] || ''}</span>
            <span>单据日期：{firstItem['单据日期'] || ''}</span>
            <span>单号：{firstItem['单据编号'] || ''}</span>
          </div>

          {/* 客户信息行2 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
            <span>销售单号：</span>
            <span>存储地点名称：成品仓</span>
            <span style={{ width: '120px', display: 'inline-block' }}>来源单号：</span>
          </div>

          {/* 主要表格 */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '8%', textAlign: 'center' }}>行号</th>
                <th style={{ ...thStyle, width: '14%', textAlign: 'center' }}>货号</th>
                <th style={{ ...thStyle, width: '30%' }}>品名</th>
                <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>规格</th>
                <th style={{ ...thStyle, width: '13%', textAlign: 'center' }}>销售(单位)</th>
                <th style={{ ...thStyle, width: '8%', textAlign: 'center' }}>库存单位</th>
                <th style={{ ...thStyle, width: '17%', textAlign: 'center' }}>69条码号</th>
              </tr>
            </thead>
            <tbody>
              {dataList.map((row: any, rowIndex: number) => (
                <tr key={rowIndex}>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{(rowIndex + 1) * 10}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['货号'] || ''}</td>
                  <td style={cellStyle}>{row['料品名称'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['规格'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['出库数量(销售单位)'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['销售单位'] || ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{row['参考料号2'] || ''}</td>
                </tr>
              ))}
              {/* 小计和合计 */}
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本页小计</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{total.toLocaleString()}</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本单合计</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{total.toLocaleString()}</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
            </tbody>
          </table>

          {/* 业务员、库管员、备注 */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px', fontSize: '12px' }}>
            <span style={{ width: '30%', display: 'inline-block' }}>业务员：</span>
            <span style={{ width: '30%', display: 'inline-block' }}>库管员：</span>
            <span style={{ display: 'inline-block' }}>地址及备注：</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="printJS-form">
      {data.map((order, index) => renderOrder(order, index))}
    </div>
  );
};

export default OutboundPrintTable;
