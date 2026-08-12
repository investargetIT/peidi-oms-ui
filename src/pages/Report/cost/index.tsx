import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  Space,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Upload,
  message,
} from 'antd';
import { SearchOutlined, EditOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { UploadProps } from 'antd';
import FinanceUnitCostApi, {
  type FinanceUnitCostVo,
  type FinanceUnitCostPageReq,
  type FinanceUnitCostUpdateReq,
} from '@/services/financeUnitCostApi';

const CostTab: React.FC = () => {
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
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importDate, setImportDate] = useState<string>(dayjs().format('YYYY-MM'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  // 导入结果详情弹窗
  const [importResult, setImportResult] = useState<{
    addCount: number;
    updateCount: number;
    skipCount: number;
    skippedLines: string[];
  } | null>(null);

  const parseImportResult = (raw: unknown) => {
    const text = typeof raw === 'string' ? raw : '';
    const summary =
      text.match(
        /导入完成[：:]\s*新增\s*(\d+)\s*条[，,]\s*更新\s*(\d+)\s*条[，,]\s*跳过\s*(\d+)\s*条/,
      );
    const addCount = summary ? Number(summary[1]) : 0;
    const updateCount = summary ? Number(summary[2]) : 0;
    const skipCount = summary ? Number(summary[3]) : 0;
    const detailIndex = text.indexOf('跳过详情');
    const skippedLines =
      detailIndex >= 0
        ? text
            .slice(detailIndex)
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => /^第\d+行/.test(s))
        : [];
    return { addCount, updateCount, skipCount, skippedLines };
  };

  const [searchBrandName, setSearchBrandName] = useState<string>('');
  const [searchMerchantCode, setSearchMerchantCode] = useState<string>('');
  const [searchProductNo, setSearchProductNo] = useState<string>('');
  const [searchU9No, setSearchU9No] = useState<string>('');
  const [searchIsNewProduct, setSearchIsNewProduct] = useState<string | undefined>(undefined);
  const [searchMonth, setSearchMonth] = useState<Dayjs | null>(dayjs());
  const [searchGroup, setSearchGroup] = useState<string>('');

  // 分页查询
  const fetchData = async (params: FinanceUnitCostPageReq = {}) => {
    setLoading(true);
    try {
      // 处理月份搜索 - 将月份格式转换为createdAt格式
      let searchParams: any = {
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        brandName: searchBrandName || undefined,
        merchantCode: searchMerchantCode || undefined,
        productNo: searchProductNo || undefined,
        u9No: searchU9No || undefined,
        isNewProduct: searchIsNewProduct || undefined,
        group: searchGroup || undefined,
        ...params,
      };

      // 如果有月份搜索条件，添加到参数中
      if (searchMonth) {
        // 将Dayjs格式的月份转换为所需的格式：2026-01-01 00:00:00
        searchParams.createdAt = searchMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      }

      const res = await FinanceUnitCostApi.getPage(searchParams);
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
    setSearchMonth(null);
    setSearchGroup('');
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    fileList: selectedFile ? [{ uid: '1', name: selectedFile.name, status: 'done' }] : [],
    onRemove: () => {
      setSelectedFile(null);
    },
    accept: '.xlsx,.xls,.csv',
  };

  // 提交导入
  const handleImport = async () => {
    if (!selectedFile) {
      message.error('请选择文件');
      return;
    }
    if (!importDate) {
      message.error('请选择日期');
      return;
    }

    setImporting(true);
    try {
      const res = await FinanceUnitCostApi.import({
        createDate: importDate,
        file: selectedFile,
      });
      if (res.code === 200 || res.success) {
        const result = parseImportResult(res.data);

        // 全部成功（无跳过）→ 顶部简短提示
        if (result.skipCount === 0) {
          message.success(
            `导入成功：新增 ${result.addCount} 条，更新 ${result.updateCount} 条`,
          );
          setImportModalVisible(false);
          setSelectedFile(null);
          fetchData({ pageNum: 1 });
        } else {
          // 含跳过数据 → 弹出结果详情弹窗，并刷新列表
          setImportResult(result);
          setImportModalVisible(false);
          setSelectedFile(null);
          fetchData({ pageNum: 1 });
        }
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '导入失败');
      } else {
        message.error(res.msg || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 编辑操作 - 打开弹窗
  const handleEdit = (record: FinanceUnitCostVo) => {
    if (!record.id) return;
    setEditingRecord(record);
    form.setFieldsValue({
      financeCost: record.financeCost,
      internalPrice: record.internalPrice,
      remark: record.remark,
      own: record.own,
      isNewProduct: record.isNewProduct,
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
        financeCost: values.financeCost,
        internalPrice: values.internalPrice,
        remark: values.remark,
        own: values.own,
        isNewProduct: values.isNewProduct,
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
      title: '组织',
      dataIndex: 'group',
      key: 'group',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '系列分类',
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
      title: '财务单位成本',
      dataIndex: 'financeCost',
      key: 'financeCost',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalPrice',
      key: 'internalPrice',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 100,
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

  return (
        <>
        {/* 搜索栏 */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            {/* 月份 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>月份</span>
              <DatePicker.MonthPicker
                style={{ width: 180 }}
                value={searchMonth}
                onChange={(date) => setSearchMonth(date)}
                format="YYYY-MM"
                placeholder="请选择月份"
                allowClear
              />
            </div>
    
            {/* 组织 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>组织</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 品牌 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>品牌</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchBrandName}
                onChange={(e) => setSearchBrandName(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 条码 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>条码</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchMerchantCode}
                onChange={(e) => setSearchMerchantCode(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 货号 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>货号</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchProductNo}
                onChange={(e) => setSearchProductNo(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 料号 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>料号</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchU9No}
                onChange={(e) => setSearchU9No(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 是否新品 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>是否新品</span>
              <Select
                style={{ width: 130 }}
                allowClear
                value={searchIsNewProduct}
                onChange={(value) => setSearchIsNewProduct(value)}
                placeholder="请选择"
                options={[
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ]}
              />
            </div>
    
            {/* 操作按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
              <Space>
                <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              导入成本数据
            </Button>
          </div>
        </div>
    
        {/* 表格 */}
        <Table
          columns={costColumns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 2000 }}
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
          styles={{ body: { padding: '16px' } }}
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
              label="财务单位成本"
              name="financeCost"
              rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入财务单位成本"
                precision={2}
                min={0}
              />
            </Form.Item>
            <Form.Item
              label="内部转移单价"
              name="internalPrice"
              rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入内部转移单价"
                precision={2}
                min={0}
              />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea placeholder="请输入备注" rows={3} />
            </Form.Item>
            <Form.Item label="自有/外采" name="own">
              <Select
                placeholder="请选择"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: '自有', value: '自有' },
                  { label: '外采', value: '外采' },
                ]}
              />
            </Form.Item>
            <Form.Item label="是否新品" name="isNewProduct">
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
          </Form>
        </Modal>
    
        {/* 导入弹窗 */}
        <Modal
          title="导入成本数据"
          open={importModalVisible}
          onOk={handleImport}
          onCancel={() => {
            setImportModalVisible(false);
            setSelectedFile(null);
          }}
          confirmLoading={importing}
          okText="导入"
          cancelText="取消"
          styles={{ body: { padding: '8px 0' } }}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                日期 <span style={{ color: 'red' }}>*</span>
              </div>
              <DatePicker.MonthPicker
                style={{ width: '100%' }}
                value={importDate ? dayjs(importDate) : null}
                onChange={(date) => setImportDate(date ? date.format('YYYY-MM') : '')}
                placeholder="请选择月份"
              />
            </div>
            <div>
              <div style={{ marginBottom: 8 }}>
                文件 <span style={{ color: 'red' }}>*</span>
              </div>
              <Upload {...uploadProps}>
                <Button icon={<FileTextOutlined />}>选择文件</Button>
              </Upload>
              <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                支持 .xlsx, .xls, .csv 格式文件
              </div>
            </div>
          </div>
        </Modal>
    
        {/* 导入结果详情弹窗（含跳过数据时弹出） */}
        <Modal
          title={
            importResult
              ? importResult.skipCount > 0 && importResult.addCount + importResult.updateCount === 0
                ? '导入完成（数据全部跳过）'
                : '导入完成（含跳过数据）'
              : '导入结果'
          }
          open={!!importResult}
          onCancel={() => setImportResult(null)}
          onOk={() => setImportResult(null)}
          okText="我知道了"
          cancelButtonProps={{ style: { display: 'none' } }}
          width={720}
        >
          {importResult && (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: '#fafafa',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <Space size={16} wrap>
                  <span>
                    新增{' '}
                    <span style={{ color: '#52c41a', fontWeight: 600 }}>
                      {importResult.addCount}
                    </span>{' '}
                    条
                  </span>
                  <span>
                    更新{' '}
                    <span style={{ color: '#1890ff', fontWeight: 600 }}>
                      {importResult.updateCount}
                    </span>{' '}
                    条
                  </span>
                  <span>
                    跳过{' '}
                    <span style={{ color: '#faad14', fontWeight: 600 }}>
                      {importResult.skipCount}
                    </span>{' '}
                    条
                  </span>
                </Space>
              </div>
    
              {importResult.skippedLines.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    跳过详情（共 {importResult.skippedLines.length} 条）：
                  </div>
                  <div
                    style={{
                      maxHeight: 360,
                      overflowY: 'auto',
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 4,
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {importResult.skippedLines.join('\n')}
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
        </>
  );
};

export default CostTab;
