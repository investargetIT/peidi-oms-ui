import React, { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
} from '@/services/managementReportApi';
import { channelBillColumns } from '../columns';

const WechatBillPanel: React.FC = () => {
  const [billDate, setBillDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [shopName, setShopName] = useState<string>('');
  const [generateStatus, setGenerateStatus] = useState<number | undefined>(undefined);
  const [billLoading, setBillLoading] = useState(false);
  const [billData, setBillData] = useState<FinanceZfbBillInfoVo[]>([]);
  const [billPagination, setBillPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 微信目前暂不开放上传账单功能，仅支持账单查询

  const fetchBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: billPagination.current,
        pageSize: billPagination.pageSize,
        billDate: billDate ? billDate.format('YYYY-MM') : undefined,
        shopName: shopName || undefined,
        generateStatus,
        platform: '微信',
        ...params,
      };
      const res: { code: number; data?: IPageFinanceZfbBillInfoVo; msg?: string; success?: boolean } =
        await ManagementReportApi.getZfbBillPage(searchParams);
      if (res.code === 200) {
        const data = res.data || ({} as IPageFinanceZfbBillInfoVo);
        setBillData(data.records || []);
        setBillPagination({ current: data.current || 1, pageSize: data.size || 10, total: data.total || 0 });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询微信账单失败:', error);
      message.error('查询微信账单失败');
    } finally {
      setBillLoading(false);
    }
  };

  const handleSearch = () => {
    setBillPagination((prev) => ({ ...prev, current: 1 }));
    fetchBill({ pageNum: 1 });
  };

  const handleReset = () => {
    setBillDate(null);
    setShopName('');
    setGenerateStatus(undefined);
    setBillPagination({ current: 1, pageSize: 10, total: 0 });
    fetchBill({ pageNum: 1 });
  };

  useEffect(() => {
    fetchBill({ pageNum: 1 });
  }, []);
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>账单日期</span>
            <DatePicker.MonthPicker
              style={{ width: 160 }}
              value={billDate}
              onChange={(date) => setBillDate(date)}
              format="YYYY-MM"
              placeholder="请选择月份"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>店铺名称</span>
            <Input style={{ width: 180 }} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="模糊匹配" allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>生成状态</span>
            <Select
              style={{ width: 140 }}
              value={generateStatus}
              onChange={(v) => setGenerateStatus(v)}
              placeholder="请选择"
              allowClear
              options={[
                { label: '待生成', value: 0 },
                { label: '生成中', value: 1 },
                { label: '生成成功', value: 2 },
                { label: '生成失败', value: 3 },
                { label: '无业务数据', value: 5 },
                { label: '未知错误', value: 6 },
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
            <Space>
              <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />} loading={billLoading}>搜索</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </div>
        </div>
      </div>

      <Table
        columns={channelBillColumns}
        dataSource={billData}
        rowKey="id"
        loading={billLoading}
        size="small"
        scroll={{ x: 1800 }}
        pagination={{
          ...billPagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setBillPagination((prev) => ({ ...prev, current: page, pageSize: pageSize || 10 }));
            fetchBill({ pageNum: page, pageSize });
          },
        }}
      />
    </>
  );
};

export default WechatBillPanel;
