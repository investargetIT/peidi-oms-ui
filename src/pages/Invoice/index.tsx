import { ExclamationCircleOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Table,
  TableColumnsType,
  TableProps,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import InvoiceModal from './Modal';
import type { InvoiceModalRef } from './Modal';

export interface DataType {
  key: string;
  date: string;
  number: string;
  type: string;
  custom: string;
  materialNumber: string;
  goodsNumber: string;
  sequenceNumber: string;
  materialName: string;
  otherBrand: string;
  brand: string;
  purchaseCategory: string;
  outboundQuantity: string;
  salesUnit: string;
  countryPrice: string;
  totalPrice: string;
  batchNumber: string;
  creator: string;
  purchaseOrderNumber: string;
}

const columns: TableColumnsType<DataType> = [
  {
    title: '单据日期',
    dataIndex: 'date',
  },
  {
    title: '单据编号',
    dataIndex: 'number',
  },
  {
    title: '单据类型',
    dataIndex: 'type',
  },
  {
    title: '客户',
    dataIndex: 'custom',
  },
  {
    title: '料号',
    dataIndex: 'materialNumber',
  },
  {
    title: '货号',
    dataIndex: 'goodsNumber',
  },
  {
    title: '序列编码',
    dataIndex: 'sequenceNumber',
  },
  {
    title: '料品名称',
    dataIndex: 'materialName',
  },
  {
    title: '其他品牌',
    dataIndex: 'otherBrand',
  },
  {
    title: '品牌',
    dataIndex: 'brand',
  },
  {
    title: '采购分类',
    dataIndex: 'purchaseCategory',
  },
  {
    title: '出库数量',
    dataIndex: 'outboundQuantity',
  },
  {
    title: '销售单位',
    dataIndex: 'salesUnit',
  },
  {
    title: '国家价',
    dataIndex: 'countryPrice',
  },
  {
    title: '价格合计',
    dataIndex: 'totalPrice',
  },
  {
    title: '批号',
    dataIndex: 'batchNumber',
  },
  {
    title: '创建人',
    dataIndex: 'creator',
  },
  {
    title: '采购单编号',
    dataIndex: 'purchaseOrderNumber',
  },
];

const data: DataType[] = [
  {
    key: '1',
    date: '2025.10.22',
    number: 'SM202510001',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50303001',
    goodsNumber: 'CK25-100',
    sequenceNumber: '697175827146',
    materialName: 'Mealyyay普通电商套餐A',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '5,000',
    salesUnit: '盒',
    countryPrice: '¥12.00',
    totalPrice: '¥60.00',
    batchNumber: '5',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
  {
    key: '2',
    date: '2025.10.22',
    number: 'SM202510002',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50303002',
    goodsNumber: 'CK32-100',
    sequenceNumber: '6280932260666',
    materialName: 'Mealyyay普通电商套餐B',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '5,000',
    salesUnit: '盒',
    countryPrice: '¥12.00',
    totalPrice: '¥60.00',
    batchNumber: '5',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
  {
    key: '3',
    date: '2025.10.22',
    number: 'SM202510003',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50301001',
    goodsNumber: 'ck37-100',
    sequenceNumber: '697175827146',
    materialName: 'Mealyyay普通套餐C',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '2,000',
    salesUnit: '盒',
    countryPrice: '¥13.00',
    totalPrice: '¥26.00',
    batchNumber: '2',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
  {
    key: '4',
    date: '2025.10.22',
    number: 'SM202510004',
    type: '跨境出货',
    custom: '鲍珂坷',
    materialNumber: '50301002',
    goodsNumber: 'CK27-100',
    sequenceNumber: '627987872312',
    materialName: 'Mealyyay普通套餐D',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '10,000',
    salesUnit: '盒',
    countryPrice: '¥12.00',
    totalPrice: '¥120.00',
    batchNumber: '1',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
];

const Invoice: React.FC = () => {
  // 是否显示提示栏
  const [showTip, setShowTip] = useState(false);
  // 表格数据
  const [tableData, setTableData] = useState(data);

  //#region 筛选逻辑
  const [searchText, setSearchText] = useState('');
  const [type, setType] = useState('全部类型');
  const [custom, setCustom] = useState('全部客户');

  useEffect(() => {
    const filteredData = data.filter((item) => {
      const numberMatch = item.number.includes(searchText);
      const customMatch = item.custom.includes(searchText);
      const materialNameMatch = item.materialName.includes(searchText);
      const typeMatch = item.type === type || type === '全部类型';
      const customMatchSelected = item.custom === custom || custom === '全部客户';

      return (numberMatch || customMatch || materialNameMatch) && typeMatch && customMatchSelected;
    });
    // console.log('filteredData', filteredData);
    setTableData(filteredData);
  }, [searchText, type, custom]);
  //#endregion

  //#region 表格状态逻辑
  // 已经选择的项
  const [selectedRows, setSelectedRows] = useState<DataType[]>([]);
  // 已经选择的项的金额合计
  const [totalPrice, setTotalPrice] = useState('0.00');

  // 金额统计
  useEffect(() => {
    const total = selectedRows.reduce(
      (acc, cur) => acc + Number(cur.totalPrice.replace('¥', '')),
      0,
    );
    setTotalPrice(total.toFixed(2));
  }, [selectedRows]);
  //#endregion

  // rowSelection object indicates the need for row selection
  const rowSelection: TableProps<DataType>['rowSelection'] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
      setSelectedRows(selectedRows);
      // 检查是否有多个客户
      const uniqueCustomers = new Set(selectedRows.map((item) => item.custom));
      setShowTip(uniqueCustomers.size > 1);
    },
    getCheckboxProps: (record: DataType) => ({
      // disabled: record.key === 'Disabled User', // Column configuration not to be checked
      name: record.date,
    }),
  };

  const invoiceModalRef = useRef<InvoiceModalRef>(null);

  return (
    <PageContainer>
      {/* 操作栏 */}
      <div style={{ marginBottom: 24, display: 'flex' }}>
        <Input
          placeholder="搜索单据编号、客户或料品名称..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          defaultValue="全部类型"
          style={{ width: 150, marginRight: 16 }}
          options={[
            { value: '全部类型', label: '全部类型' },
            { value: '内陆出货', label: '内陆出货' },
            { value: '跨境出货', label: '跨境出货' },
          ]}
          onChange={(value) => setType(value)}
        />
        <Select
          defaultValue="全部客户"
          style={{ width: 150 }}
          options={[
            { value: '全部客户', label: '全部客户' },
            { value: '北京火星', label: '北京火星' },
            { value: '上海电商', label: '上海电商' },
            { value: '绵阳国', label: '绵阳国' },
            { value: '鲍珂坷', label: '鲍珂坷' },
          ]}
          onChange={(value) => setCustom(value)}
        />
      </div>
      {/* 提示栏 */}
      {!showTip ? null : (
        <div
          style={{
            color: '#e7000b',
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <ExclamationCircleOutlined color="#e7000b" style={{ marginRight: 8 }} />
          您选择的订单涉及多个不同客户，无法提交开票申请。系统要求只能为同一客户的订单开票，请重新选择订单。
        </div>
      )}
      {/* 表格状态栏 */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div style={{ color: '#737373' }}>
          <span>
            已选择{' '}
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {selectedRows.length}
            </span>{' '}
            项
          </span>
          <span style={{ marginLeft: 16 }}>
            合计金额：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              ¥{totalPrice}
            </span>
          </span>
        </div>
        <Button
          disabled={showTip || selectedRows.length === 0}
          type="primary"
          icon={<FileTextOutlined />}
          onClick={() => invoiceModalRef.current?.showModal()}
        >
          提交开票申请
        </Button>
      </Flex>
      {/* 表格 */}
      <Table<DataType>
        rowSelection={{ type: 'checkbox', ...rowSelection }}
        columns={columns}
        dataSource={tableData}
        scroll={{ x: 'max-content' }}
      />
      {/* 开票申请弹窗 */}
      <InvoiceModal ref={invoiceModalRef} selectedRows={selectedRows} />
    </PageContainer>
  );
};

export default Invoice;
