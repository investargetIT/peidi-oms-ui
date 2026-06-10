import React from 'react';

interface SinglePrintPageProps {
  data: {
    firstItem: any;
    pageRows: any[];
    pageTotal: number;
    orderTotal: number;
    isLastPageOfOrder: boolean;
  };
}

const SinglePrintPage: React.FC<SinglePrintPageProps> = ({ data }) => {
  const { firstItem, pageRows, pageTotal, orderTotal, isLastPageOfOrder } = data;

  // 基础样式
  const baseStyle = {
    fontFamily: 'SimSun, "宋体", serif',
    fontSize: '18px',
    fontWeight: 'bold',
  };

  const pageStyle = {
    width: '210mm',
    minHeight: '280mm',
    backgroundColor: 'white',
    padding: '10mm',
    boxSizing: 'border-box' as const,
  };

  const tableStyle: any = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
    tableLayout: 'fixed',
  };

  const cellStyle = {
    border: '0.3px dashed #888',
    padding: '6px',
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

  return (
    <div style={pageStyle} className="single-pdf-page">
      <div style={baseStyle}>
        {/* 标题 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '5px' }}>
            佩蒂智创（杭州）宠物科技有限公司
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            成品出库单
          </div>
        </div>

        {/* 右上角信息 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px', fontSize: '16px', fontWeight: 'bold' }}>
          <span>立账凭证号</span>
          <span style={{ marginLeft: '20px' }}>{firstItem['立账凭证号'] || ''}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px', fontSize: '16px', fontWeight: 'bold' }}>
          <span>凭证号</span>
          <span style={{ marginLeft: '20px' }}>{firstItem['凭证显示号'] || ''}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
          <span>状态：</span>
          <span>{firstItem['状态'] || ''}</span>
        </div>

        {/* 客户信息行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          <span>客户名称：{firstItem['客户'] || ''}</span>
          <span>单据日期：{firstItem['单据日期'] || ''}</span>
          <span>单号：{firstItem['单据编号'] || ''}</span>
        </div>

        {/* 第二行信息 */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          <span style={{ width: '30%' }}>销售单号：</span>
          <span style={{ width: '40%', textAlign: 'center' }}>存储地点名称：成品仓</span>
          <span>来源单号：</span>
        </div>

        {/* 主要表格 */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '5%' }}>行号</th>
              <th style={{ ...thStyle, width: '15%' }}>货号</th>
              <th style={{ ...thStyle, width: '24%' }}>品名</th>
              <th style={{ ...thStyle, width: '24%' }}>规格</th>
              <th style={{ ...thStyle, width: '10%' }}>销售(单位)</th>
              <th style={{ ...thStyle, width: '7%' }}>库存单位</th>
              <th style={{ ...thStyle, width: '15%' }}>69条码号</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row: any, rowIndex: number) => (
              <tr key={rowIndex}>
                <td style={{ ...cellStyle, width: '5%' }}>{row.displayRowNum}</td>
                <td style={{ ...cellStyle, width: '15%' }}>{row['货号'] || ''}</td>
                <td style={{ ...cellStyle, width: '24%' }}>{row['料品名称'] || ''}</td>
                <td style={{ ...cellStyle, width: '24%' }}>{row['规格'] || ''}</td>
                <td style={{ ...cellStyle, width: '10%' }}>{row['出库数量(销售单位)'] || ''}</td>
                <td style={{ ...cellStyle, width: '7%' }}>{row['销售单位'] || ''}</td>
                <td style={{ ...cellStyle, width: '15%' }}>{row['参考料号2'] || ''}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本页小计</td>
              <td style={cellStyle}></td>
              <td style={cellStyle}>{pageTotal.toLocaleString()}</td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
            </tr>
            {isLastPageOfOrder && (
              <tr>
                <td style={{ ...cellStyle, textAlign: 'left' }} colSpan={3}>本单合计</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}>{orderTotal.toLocaleString()}</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 底部签名 */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
          <span style={{ width: '30%', display: 'inline-block' }}>业务员：</span>
          <span style={{ width: '30%', display: 'inline-block' }}>库管员：</span>
          <span style={{ display: 'inline-block' }}>地址及备注：</span>
        </div>
      </div>
    </div>
  );
};

export default SinglePrintPage;
