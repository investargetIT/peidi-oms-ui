import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Modal, Space, Table, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ChannelExtendCostApi, {
  type FinanceJdCostStatVo,
  type FinanceJd1CalculateStatVo,
  type FinanceJd2ExpenseStatVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';

/**
 * 京东 - 渠道推广费用
 *
 * 交互流程：
 *   页面：月份选择（只可选月）+ [查询] + 店铺 Table
 *   弹窗：仅展示当前选中月份下该店铺的两个统计表（无日期选择器）
 *
 * GET /oms/finance/channel-extend-cost/jd-cost-stat
 *   请求：{ shopId, startDate, endDate }
 *   返回：{ jd2ExpenseStat: 钱包支出分类, jd1CalculateStat: 账单收支计算 }
 *
 * 日期范围：取选中月份的月初（YYYY-MM-01）和月末（YYYY-MM-最后一天）
 */
const JdExtendCostPanel: React.FC = () => {
  // 页面状态：店铺列表（仅京东）
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // 月份选择（默认上个月）
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().subtract(1, 'month'));
  const [pageLoading, setPageLoading] = useState(false);

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [currentShop, setCurrentShop] = useState<ShopVo | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [jd2Data, setJd2Data] = useState<FinanceJd2ExpenseStatVo[]>([]);
  const [jd1Data, setJd1Data] = useState<FinanceJd1CalculateStatVo[]>([]);

  // 获取店铺列表（platform=京东）
  const fetchShops = async () => {
    setShopsLoading(true);
    try {
      const params: any = {
        sortStr: '',
        searchStr: JSON.stringify({
          searchName: 'platform',
          searchValue: '京东',
          searchType: 'like',
        }),
      };
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

  // 根据选中月份，计算月初/月末日期
  const getMonthRange = (month: Dayjs) => {
    const start = month.startOf('month');
    const end = month.endOf('month');
    return { startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') };
  };

  // 实际调接口
  const doFetch = async (shopId: number, start: Dayjs, end: Dayjs) => {
    setModalLoading(true);
    try {
      const res = await ChannelExtendCostApi.getJdCostStat({
        shopId,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
      });
      if (res.code === 200) {
        const data: FinanceJdCostStatVo = res.data || ({} as FinanceJdCostStatVo);
        setJd2Data(data.jd2ExpenseStat || []);
        setJd1Data(data.jd1CalculateStat || []);
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询京东费用统计失败:', error);
      message.error('查询京东费用统计失败');
    } finally {
      setModalLoading(false);
    }
  };

  // 页面顶部「查询」：仅做月份校验，并提示用户去查看详情
  const handlePageQuery = () => {
    if (!selectedMonth) {
      message.error('请选择月份');
      return;
    }
    setPageLoading(true);
    // 提示用户：已确认月份，可点击「查看详情」查看各店铺费用统计
    setTimeout(() => {
      setPageLoading(false);
      message.success('已选择月份，点击「查看详情」查看各店铺费用统计');
    }, 200);
  };

  // 打开弹窗：按当前选中月份的月初/月末请求该店铺的详情
  const handleOpenModal = (shop: ShopVo) => {
    if (shop.id === undefined || shop.id === null) {
      message.error('该店铺没有 ID，无法查询');
      return;
    }
    setCurrentShop(shop);
    setModalVisible(true);
    const { startDate, endDate } = getMonthRange(selectedMonth);
    doFetch(shop.id, dayjs(startDate), dayjs(endDate));
  };

  // 关闭弹窗：清空数据
  const handleCloseModal = () => {
    setModalVisible(false);
    setJd2Data([]);
    setJd1Data([]);
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // 店铺列表 Table 列
  const shopColumns = [
    { title: '店铺ID', dataIndex: 'id', key: 'id', width: 100 },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      render: (_: string, record: ShopVo) => (
        <span style={{ fontSize: 13 }}>{displayShopName(record.wdtName || record.shopName)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ShopVo) => (
        <Button type="link" size="small" onClick={() => handleOpenModal(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  // 京东钱包支出分类统计
  const jd2Columns = [
    {
      title: '备注分类',
      dataIndex: 'remarkCategory',
      key: 'remarkCategory',
      render: (text: string) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
    },
    {
      title: '支出总额（元）',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      width: 160,
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ fontSize: 12 }}>{value !== undefined ? value.toFixed(2) : '-'}</span>
      ),
    },
  ];

  // 京东账单收支计算统计
  const jd1Columns = [
    {
      title: '账单日期',
      dataIndex: 'billDate',
      key: 'billDate',
      width: 120,
      render: (text: string) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
    },
    {
      title: '业务描述',
      dataIndex: 'businessDesc',
      key: 'businessDesc',
      render: (text: string) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
    },
    {
      title: '收支合计（元）',
      dataIndex: 'calculate',
      key: 'calculate',
      width: 140,
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ fontSize: 12 }}>{value !== undefined ? value.toFixed(2) : '-'}</span>
      ),
    },
  ];

  // 过滤出京东店铺
  const filteredShops = shopList.filter(
    (s) => s.platform === '京东' && s.id !== undefined && s.id !== null,
  );

  return (
    <>
      {/* 月份选择 + 查询按钮（位于店铺 Table 上方） */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#666' }}>
            月份 <span style={{ color: 'red' }}>*</span>
          </span>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(date) => setSelectedMonth(date || dayjs().subtract(1, 'month'))}
            format="YYYY-MM"
            placeholder="请选择月份"
            allowClear={false}
            style={{ width: 160 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
          <Space>
            <Button
              type="primary"
              onClick={handlePageQuery}
              icon={<SearchOutlined />}
              loading={pageLoading}
            >
              查询
            </Button>
          </Space>
        </div>
      </div>

      {/* 店铺 Table */}
      <Table
        columns={shopColumns}
        dataSource={filteredShops}
        rowKey="id"
        loading={shopsLoading}
        size="small"
        pagination={false}
        scroll={{ x: 500 }}
      />

      {/* 详情弹窗（不再包含日期选择器） */}
      <Modal
        title={
          currentShop
            ? `${displayShopName(currentShop.wdtName || currentShop.shopName)} 京东费用统计`
            : '京东费用统计'
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={1000}
        destroyOnClose
        maskClosable={false}
      >
        {/* 京东钱包支出分类统计 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          京东钱包支出分类统计
          {jd2Data.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （{jd2Data.length} 条）
            </span>
          )}
        </div>
        <Table
          columns={jd2Columns}
          dataSource={jd2Data}
          rowKey={(record, index) => `${record.remarkCategory || ''}-${index}`}
          loading={modalLoading}
          size="small"
          pagination={false}
          scroll={{ x: 400 }}
          style={{ marginBottom: 24 }}
        />

        {/* 京东账单收支计算统计 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          京东账单收支计算统计
          {jd1Data.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （{jd1Data.length} 条）
            </span>
          )}
        </div>
        <Table
          columns={jd1Columns}
          dataSource={jd1Data}
          rowKey={(record, index) =>
            `${record.billDate || ''}-${record.businessDesc || ''}-${index}`
          }
          loading={modalLoading}
          size="small"
          scroll={{ x: 600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Modal>
    </>
  );
};

export default JdExtendCostPanel;
