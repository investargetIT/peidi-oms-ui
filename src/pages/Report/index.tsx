import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { SearchOutlined, EditOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Input, Select, Table, Tabs, message, Space, Modal, Form, InputNumber, DatePicker, Upload } from 'antd';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import FinanceUnitCostApi, {
  type FinanceUnitCostVo,
  type FinanceUnitCostPageReq,
  type FinanceUnitCostUpdateReq,
} from '@/services/financeUnitCostApi';
import ChannelExtendCostApi, {
  type PageRequest,
  type FinanceChannelExtendCostShopGroupVo,
  type FinanceChannelExtendCostMonthGroupVo,
  type FinanceChannelExtendCostDetailVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';

const Report: React.FC = () => {
  // 从localStorage读取上次激活的tab，刷新后保持不变
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('report_active_tab') || 'cost';
  });

  // 保存激活的tab到localStorage
  useEffect(() => {
    localStorage.setItem('report_active_tab', activeTab);
  }, [activeTab]);
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

  // 搜索条件 - 成本核算
  const [searchBrandName, setSearchBrandName] = useState<string>('');
  const [searchMerchantCode, setSearchMerchantCode] = useState<string>('');
  const [searchProductNo, setSearchProductNo] = useState<string>('');
  const [searchU9No, setSearchU9No] = useState<string>('');
  const [searchIsNewProduct, setSearchIsNewProduct] = useState<string | undefined>(
    undefined,
  );
  const [searchMonth, setSearchMonth] = useState<Dayjs | null>(dayjs());
  const [searchGroup, setSearchGroup] = useState<string>('');

  // 渠道枚举选项
  const channelOptions = [
    { label: '拼多多', value: '拼多多' },
    { label: '天猫', value: '天猫' },
    { label: '抖音', value: '抖音' },
    { label: '京东', value: '京东' },
  ];

  // 渠道推广费用状态
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelDataSource, setChannelDataSource] = useState<FinanceChannelExtendCostShopGroupVo[]>([]);
  const [channelPagination, setChannelPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // 明细弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDataSource, setDetailDataSource] = useState<FinanceChannelExtendCostDetailVo[]>([]);
  const [detailPagination, setDetailPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  // 当前查看明细的查询参数
  const [detailQueryParams, setDetailQueryParams] = useState<{
    shopId?: number;
    channel?: string;
    yearMonth?: string;
    accountType?: string;
  }>({});

  // 费用分类统计弹窗状态
  const [statModalVisible, setStatModalVisible] = useState(false);
  const [statModalTitle, setStatModalTitle] = useState('');
  const [statLoading, setStatLoading] = useState(false);
  const [statDataSource, setStatDataSource] = useState<{
    costCategory?: string;
    costType?: string;
    totalExpense?: number;
    wdtName?: string;
  }[]>([]);

  // 搜索条件 - 渠道推广费用
  const [searchAccountType, setSearchAccountType] = useState<string>('');
  const [searchChannel, setSearchChannel] = useState<string | undefined>(undefined);
  const [searchShopId, setSearchShopId] = useState<number | undefined>(undefined);
  const [searchYearMonth, setSearchYearMonth] = useState<Dayjs | null>(dayjs());

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

  // 页面初始化时默认搜索一次
  useEffect(() => {
    fetchData();
  }, []);

  // 切换tab时自动加载数据，若已有渠道自动加载店铺
  useEffect(() => {
    if (activeTab === 'channel-extend-cost' && channelDataSource.length === 0) {
      fetchChannelData();
    }
    if (activeTab === 'channel-extend-cost' && searchChannel && shopList.length === 0) {
      fetchShops(searchChannel);
    }
  }, [activeTab]);

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

  // 获取店铺列表
  const fetchShops = async (channel?: string) => {
    setShopsLoading(true);
    try {
      const params: any = {
        sortStr: '',
      };
      if (channel) {
        // 根据渠道名称搜索，将JSON放到searchStr里
        params.searchStr = JSON.stringify({
          searchName: 'platform',
          searchValue: channel,
          searchType: 'like',
        });
      }
      const res = await ChannelExtendCostApi.getShops(params);
      if (res.code === 200) {
        setShopList(res.data || []);
      } else {
        message.error('获取店铺列表失败');
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      message.error('获取店铺列表失败');
    } finally {
      setShopsLoading(false);
    }
  };

  // 渠道推广费用分页查询
  const fetchChannelData = async (params: PageRequest = {}) => {
    setChannelLoading(true);
    try {
      let searchParams: any = {
        pageNum: channelPagination.current,
        pageSize: channelPagination.pageSize,
        accountType: searchAccountType || undefined,
        channel: searchChannel || undefined,
        shopId: searchShopId || undefined,
        ...params,
      };

      if (searchYearMonth) {
        searchParams.yearMonth = searchYearMonth.format('YYYY-MM');
      }

      const res = await ChannelExtendCostApi.getGroupPage(searchParams);
      if (res.code === 200) {
        setChannelDataSource(res.data.records || []);
        setChannelPagination({
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
      setChannelLoading(false);
    }
  };

  // 渠道变化时重新获取店铺列表并清空已选店铺
  const handleChannelChange = (channel: string | undefined) => {
    setSearchChannel(channel);
    setSearchShopId(undefined);
    if (channel) {
      fetchShops(channel);
    } else {
      setShopList([]);
    }
  };

  // 渠道推广费用搜索
  const handleChannelSearch = () => {
    if (!searchYearMonth) {
      message.error('请选择年月');
      return;
    }
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
    fetchChannelData({ pageNum: 1 });
  };

  // 渠道推广费用重置搜索
  const handleChannelReset = () => {
    setSearchAccountType('');
    setSearchChannel(undefined);
    setSearchShopId(undefined);
    setSearchYearMonth(dayjs());
    setShopList([]);
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
  };

  // 上传文件配置
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
        message.success('导入成功');
        setImportModalVisible(false);
        setSelectedFile(null);
        fetchData({ pageNum: 1 });
      } else if (res.code === 500) {
        message.error(res.data || res.msg || '导入失败');
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
    {
      key: 'channel-extend-cost',
      label: '渠道推广费用',
    },
  ];

  // 渠道推广费用明细表格列
  const detailColumns = [
    {
      title: '账务类型',
      dataIndex: 'accountType',
      key: 'accountType',
      minWidth: 80,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '业务描述',
      dataIndex: 'businessDesc',
      key: 'businessDesc',
      minWidth: 200,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      minWidth: 60,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '支出金额',
      dataIndex: 'expenseAmount',
      key: 'expenseAmount',
      minWidth: 80,
      whiteSpace: 'nowrap',
      render: (value: number) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{value !== undefined ? value.toFixed(2) : '-'}</span>,
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      minWidth: 140,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '店铺ID',
      dataIndex: 'shopId',
      key: 'shopId',
      minWidth: 60,
      whiteSpace: 'nowrap',
      render: (text: number) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      minWidth: 150,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
  ];

  // 获取明细数据
  const fetchDetailData = async (params: {
    shopId?: number;
    channel?: string;
    yearMonth?: string;
    accountType?: string;
    pageNum?: number;
    pageSize?: number;
  } = {}) => {
    setDetailLoading(true);
    try {
      const searchParams: any = {
        pageNum: detailPagination.current,
        pageSize: detailPagination.pageSize,
        ...detailQueryParams,
        ...params,
      };

      const res = await ChannelExtendCostApi.getDetails(searchParams);
      if (res.code === 200) {
        setDetailDataSource(res.data.records || []);
        setDetailPagination({
          current: res.data.current || 1,
          pageSize: res.data.size || 20,
          total: res.data.total || 0,
        });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : '获取明细失败');
      } else {
        message.error('获取明细失败');
      }
    } catch (error) {
      console.error('获取明细失败:', error);
      message.error('获取明细失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 打开明细弹窗
  const openDetailModal = (
    wdtName: string | undefined,
    yearMonth: string | undefined,
    shopId: number | undefined,
    channel: string | undefined,
  ) => {
    const title = `${wdtName || ''} ${yearMonth || ''} 渠道推广费用明细`;
    setDetailModalTitle(title);
    // 打开前先清空旧数据
    setDetailDataSource([]);
    // 设置查询参数
    const queryParams = {
      shopId,
      channel,
      yearMonth,
      accountType: searchAccountType,
    };
    setDetailQueryParams(queryParams);
    // 重置分页
    setDetailPagination({
      current: 1,
      pageSize: 20,
      total: 0,
    });
    setDetailModalVisible(true);
    // 加载第一页数据
    fetchDetailData({ ...queryParams, pageNum: 1 });
  };

  // 打开费用分类统计弹窗
  const openStatModal = async (
    wdtName: string | undefined,
    yearMonth: string | undefined,
    shopId: number | undefined,
  ) => {
    const title = `${wdtName || ''} ${yearMonth} 站内外推广费统计`;
    setStatModalTitle(title);
    // 打开前先清空旧数据
    setStatDataSource([]);
    setStatModalVisible(true);
    setStatLoading(true);
    try {
      const res = await ChannelExtendCostApi.getCostCategoryStat({
        shopId: shopId!,
        yearMonth: yearMonth!,
      });
      if (res.code === 200) {
        setStatDataSource(res.data || []);
      } else {
        message.error('获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      message.error('获取统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 渠道推广费用年月分组表格列（展开店铺后显示）
  const monthGroupColumns = [
    {
      title: '年月',
      dataIndex: 'yearMonth',
      key: 'yearMonth',
      width: 120,
    },
    {
      title: '明细数量',
      dataIndex: 'detailCount',
      key: 'detailCount',
      width: 100,
    },
    {
      title: '总支出金额（元）',
      dataIndex: 'totalExpenseAmount',
      key: 'totalExpenseAmount',
      width: 150,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        // record已经包含了shopId、wdtName等店铺信息，是展开时添加的
        return (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              style={{ fontSize: 12, padding: 0 }}
              onClick={() => openDetailModal(
                record.wdtName,
                record.yearMonth,
                record.shopId,
                record.channel,
              )}
            >
              查看明细
            </Button>
            <Button
              type="link"
              size="small"
              style={{ fontSize: 12, padding: '0 0 0 8px' }}
              onClick={() => openStatModal(
                record.wdtName,
                record.yearMonth,
                record.shopId,
              )}
            >
              费用统计
            </Button>
          </Space>
        );
      },
    },
  ];

  // 渠道推广费用店铺分组表格列（最外层）
  const shopGroupColumns = [
    {
      title: '店铺ID',
      dataIndex: 'shopId',
      key: 'shopId',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
    },
    {
      title: '明细总数量',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 120,
    },
    {
      title: '总支出金额（元）',
      dataIndex: 'totalExpenseAmount',
      key: 'totalExpenseAmount',
      width: 150,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
  ];

  // 渲染年月分组表格（展开店铺后显示）
  const expandedMonthRowRender = (record: FinanceChannelExtendCostShopGroupVo) => {
    const monthGroups = record.monthGroups || [];
    // 添加店铺信息到每条记录，方便获取shopId
    const monthGroupsWithShopInfo = monthGroups.map(item => ({
      ...item,
      shopId: record.shopId,
      wdtName: record.wdtName,
      channel: record.channel,
    }));
    return (
      <Table
        columns={monthGroupColumns}
        dataSource={monthGroupsWithShopInfo}
        rowKey="yearMonth"
        size="small"
        pagination={false}
        scroll={{ y: 250 }}
      />
    );
  };

  return (
    <PageContainer>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
        size="large"
        type="card"
      />

      {activeTab === 'cost' && (
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
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <DatePicker.MonthPicker
                placeholder="选择月份"
                style={{ width: 220 }}
                value={searchMonth}
                onChange={(date) => setSearchMonth(date)}
                allowClear
              />
              <Input
                placeholder="搜索组织（模糊匹配）"
                prefix={<SearchOutlined />}
                style={{ width: 220 }}
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                allowClear
              />
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
        </>
      )}

      {activeTab === 'channel-extend-cost' && (
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
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Select
                placeholder="选择渠道"
                style={{ width: 150 }}
                value={searchChannel}
                onChange={handleChannelChange}
                allowClear
                options={channelOptions}
              />
              <Select
                placeholder="选择店铺"
                style={{ width: 220 }}
                value={searchShopId}
                onChange={(value) => setSearchShopId(value)}
                allowClear
                loading={shopsLoading}
                options={shopList.map(shop => ({
                  label: shop.wdtName || shop.shopName,
                  value: shop.id,
                }))}
                showSearch
                optionFilterProp="label"
                disabled={!searchChannel}
              />
              <DatePicker.MonthPicker
                placeholder="选择年月 *"
                style={{ width: 180 }}
                value={searchYearMonth}
                onChange={(date) => setSearchYearMonth(date)}
                allowClear={false}
              />
              <Input
                placeholder="搜索账务类型"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                value={searchAccountType}
                onChange={(e) => setSearchAccountType(e.target.value)}
                allowClear
              />
              <Space>
                <Button type="primary" onClick={handleChannelSearch} icon={<SearchOutlined />}>
                  搜索
                </Button>
                <Button onClick={handleChannelReset}>重置</Button>
              </Space>
            </div>
          </div>

          {/* 表格 */}
          <Table
            columns={shopGroupColumns}
            dataSource={channelDataSource}
            rowKey="shopId"
            loading={channelLoading}
            size="small"
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowRender: expandedMonthRowRender,
            }}
            pagination={{
              ...channelPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setChannelPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || 10,
                }));
                fetchChannelData({ pageNum: page, pageSize });
              },
            }}
          />

          {/* 明细弹窗 - 单例模式 */}
          <Modal
            title={detailModalTitle}
            open={detailModalVisible}
            onCancel={() => setDetailModalVisible(false)}
            footer={null}
            width={900}
            destroyOnClose
            maskClosable={false}
            bodyStyle={{ padding: '16px' }}
          >
            <style>{`
              .detail-table-small tr td {
                padding: 4px 8px !important;
                line-height: 1.3 !important;
                height: 28px !important;
                white-space: nowrap !important;
              }
              .detail-table-small tr th {
                padding: 6px 8px !important;
                line-height: 1.3 !important;
                white-space: nowrap !important;
              }
            `}</style>
            <Table
              columns={detailColumns}
              dataSource={detailDataSource}
              rowKey="id"
              loading={detailLoading}
              size="small"
              className="detail-table-small"
              style={{ fontSize: 12 }}
              scroll={{ x: 800 }}
              pagination={{
                ...detailPagination,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [20, 50, 100, 200],
                showTotal: (total) => `共 ${total} 条记录`,
                size: 'small',
                onChange: (page, pageSize) => {
                  setDetailPagination((prev) => ({
                    ...prev,
                    current: page,
                    pageSize: pageSize || 20,
                  }));
                  fetchDetailData({ pageNum: page, pageSize });
                },
              }}
            />
          </Modal>

          {/* 费用分类统计弹窗 */}
          <Modal
            title={statModalTitle}
            open={statModalVisible}
            onCancel={() => setStatModalVisible(false)}
            footer={null}
            width={500}
            destroyOnClose
            maskClosable={false}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <style>{`
              .stat-table-small tr td {
                padding: 4px 8px !important;
                line-height: 1.3 !important;
                height: 28px !important;
                white-space: nowrap !important;
              }
              .stat-table-small tr th {
                padding: 6px 8px !important;
                line-height: 1.3 !important;
                white-space: nowrap !important;
              }
            `}</style>
            <Table
              columns={[
                {
                  title: '费用分类',
                  dataIndex: 'costCategory',
                  key: 'costCategory',
                  render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
                },
                {
                  title: '费用类型',
                  dataIndex: 'costType',
                  key: 'costType',
                  render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
                },
                {
                  title: '总费用(元)',
                  dataIndex: 'totalExpense',
                  key: 'totalExpense',
                  width: 120,
                  render: (value: number) => <span style={{ fontSize: 12 }}>{value?.toFixed(2) || '-'}</span>,
                },
              ]}
              dataSource={statDataSource}
              rowKey={(record, index) => `${record.costType}-${index}`}
              loading={statLoading}
              size="small"
              className="stat-table-small"
              style={{ fontSize: 12 }}
              pagination={false}
              summary={() => {
                // 计算总费用合计
                const total = statDataSource.reduce((sum, item) => sum + (item.totalExpense || 0), 0);
                return (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      <span style={{ fontSize: 12 }}>合计：</span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      <span style={{ fontSize: 12 }}>{total.toFixed(2)}</span>
                    </td>
                  </tr>
                );
              }}
            />
          </Modal>
        </>
      )}
    </PageContainer>
  );
};

export default Report;

