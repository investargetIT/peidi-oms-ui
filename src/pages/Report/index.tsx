import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table, Tabs, message, Space, Modal, Form, InputNumber } from 'antd';
import FinanceUnitCostApi, {
  type FinanceUnitCostVo,
  type FinanceUnitCostPageReq,
  type FinanceUnitCostUpdateReq,
} from '@/services/financeUnitCostApi';

const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cost');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FinanceUnitCostVo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceUnitCostVo | null>(null);
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);

  // 搜索条件
  const [searchBrandName, setSearchBrandName] = useState<string>('');
  const [searchMerchantCode, setSearchMerchantCode] = useState<string>('');
  const [searchProductNo, setSearchProductNo] = useState<string>('');
  const [searchU9No, setSearchU9No] = useState<string>('');
  const [searchIsNewProduct, setSearchIsNewProduct] = useState<string | undefined>(
    undefined,
  );

  // 分页查询
  const fetchData = async (params: FinanceUnitCostPageReq = {}) => {
    setLoading(true);
    try {
      const res = await FinanceUnitCostApi.getPage({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        brandName: searchBrandName || undefined,
        merchantCode: searchMerchantCode || undefined,
        productNo: searchProductNo || undefined,
        u9No: searchU9No || undefined,
        isNewProduct: searchIsNewProduct || undefined,
        ...params,
      });
      if (res.code === 200) {
        setDataSource(res.data.records || []);
        setPagination({
          current: res.data.current || 1,
          pageSize: res.data.size || 10,
          total: res.data.total || 0,
        });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : '获取数据失败');
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 点击搜索
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchData({ pageNum: 1 });
  };

  // 页面初始化时默认搜索一次
  useEffect(() => {
    fetchData();
  }, []);

  // 重置搜索
  const handleReset = () => {
    setSearchBrandName('');
    setSearchMerchantCode('');
    setSearchProductNo('');
    setSearchU9No('');
    setSearchIsNewProduct(undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // 编辑操作 - 打开弹窗
  const handleEdit = (record: FinanceUnitCostVo) => {
    if (!record.id) return;
    setEditingRecord(record);
    form.setFieldsValue({
      matchedCost: record.matchedCost,
      financeCost: record.financeCost,
      internalPrice: record.internalPrice,
      isNewProduct: record.isNewProduct,
      remark: record.remark,
    });
    setEditModalVisible(true);
  };

  // 确认更新
  const handleConfirmUpdate = async () => {
    if (!editingRecord) return;
    try {
      const values = await form.validateFields();
      if (!editingRecord.id) {
        message.error('记录ID不存在');
        return;
      }

      setUpdating(true);
      const updateParams: FinanceUnitCostUpdateReq = {
        id: editingRecord.id,
        matchedCost: values.matchedCost,
        financeCost: values.financeCost,
        internalPrice: values.internalPrice,
        isNewProduct: values.isNewProduct,
        remark: values.remark,
      };

      const res = await FinanceUnitCostApi.update(updateParams);
      if (res.code === 200 || res.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        fetchData();
      } else if (res.code === 500) {
        message.error(res.data || res.msg || '更新失败');
      } else {
        message.error(res.msg || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  // 成本核算表格列定义
  const costColumns = [
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: 'SPU',
      dataIndex: 'spu',
      key: 'spu',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '料号',
      dataIndex: 'u9No',
      key: 'u9No',
      width: 120,
    },
    {
      title: '条码',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 150,
    },
    {
      title: '货号',
      dataIndex: 'productNo',
      key: 'productNo',
      width: 150,
    },
    {
      title: '品名',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 250,
    },
    {
      title: '匹配成本',
      dataIndex: 'matchedCost',
      key: 'matchedCost',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(5) : '-'),
    },
    {
      title: '财务成本',
      dataIndex: 'financeCost',
      key: 'financeCost',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '内结价',
      dataIndex: 'internalPrice',
      key: 'internalPrice',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '是否新品',
      dataIndex: 'isNewProduct',
      key: 'isNewProduct',
      width: 100,
      render: (value: string) => {
        if (value === '1') return '是';
        if (value === '0') return '否';
        return value || '-';
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: FinanceUnitCostVo) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  const tabItems = [
    {
      key: 'cost',
      label: '成本核算',
    },
  ];

  return (
    <PageContainer>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {activeTab === 'cost' && (
        <>
          {/* 搜索栏 */}
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Input
              placeholder="搜索品牌（模糊匹配）"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchBrandName}
              onChange={(e) => setSearchBrandName(e.target.value)}
              allowClear
            />
            <Input
              placeholder="搜索条码（模糊匹配）"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchMerchantCode}
              onChange={(e) => setSearchMerchantCode(e.target.value)}
              allowClear
            />
            <Input
              placeholder="搜索货号（模糊匹配）"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchProductNo}
              onChange={(e) => setSearchProductNo(e.target.value)}
              allowClear
            />
            <Input
              placeholder="搜索料号（模糊匹配）"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchU9No}
              onChange={(e) => setSearchU9No(e.target.value)}
              allowClear
            />
            <Select
              placeholder="是否新品"
              style={{ width: 150 }}
              allowClear
              value={searchIsNewProduct}
              onChange={(value) => setSearchIsNewProduct(value)}
              options={[
                { label: '是', value: '1' },
                { label: '否', value: '0' },
              ]}
            />
            <Space>
              <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table
            columns={costColumns}
            dataSource={dataSource}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 1900 }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || 20,
                }));
                fetchData({ pageNum: page, pageSize });
              },
            }}
          />

          {/* 编辑弹窗 */}
          <Modal
            title="编辑成本核算"
            open={editModalVisible}
            onOk={handleConfirmUpdate}
            onCancel={() => setEditModalVisible(false)}
            confirmLoading={updating}
            okText="确认更新"
            cancelText="取消"
            width={600}
          >
            <Form form={form} layout="vertical">
              <div style={{ marginBottom: 16 }}>
                <p>
                  <strong>品牌：</strong>
                  {editingRecord?.brandName}
                </p>
                <p>
                  <strong>品名：</strong>
                  {editingRecord?.goodsName}
                </p>
                <p>
                  <strong>条码：</strong>
                  {editingRecord?.merchantCode}
                </p>
              </div>
              <Form.Item
                label="匹配成本"
                name="matchedCost"
                rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入匹配成本"
                  precision={5}
                  min={0}
                />
              </Form.Item>
              <Form.Item
                label="财务成本"
                name="financeCost"
                rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入财务成本"
                  precision={2}
                  min={0}
                />
              </Form.Item>
              <Form.Item
                label="内结价"
                name="internalPrice"
                rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入内结价"
                  precision={2}
                  min={0}
                />
              </Form.Item>
              <Form.Item
                label="是否新品"
                name="isNewProduct"
              >
                <Select
                  placeholder="请选择"
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: '是', value: '1' },
                    { label: '否', value: '0' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label="备注"
                name="remark"
              >
                <Input.TextArea
                  placeholder="请输入备注"
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </PageContainer>
  );
};

export default Report;

