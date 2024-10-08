import { salesOutDetails } from '@/services/ant-design-pro/api';
import React, { useState } from 'react';
import { Button, message, Steps, theme, Select, DatePicker, Input, Form } from 'antd';
import dayjs from 'dayjs';
import { ProTable } from '@ant-design/pro-components';

const { RangePicker } = DatePicker;

const steps = [
  { title: 'First', content: 'First-content' },
  { title: 'Second', content: 'Second-content' },
  { title: 'Last', content: 'Last-content' },
];

// 表单和表格组件
const ListAndFilterForm: React.FC<{ 
  onFetchList: (values: any, page: number, pageSize: number) => void, 
  listData: any[], 
  pagination: any, 
  onPageChange: (page: number, pageSize: number) => void 
}> = ({ onFetchList, listData, pagination, onPageChange }) => {
  const [form] = Form.useForm();

  // 表格的列定义
  const columns = [
    { title: '订单号', dataIndex: 'oid', key: 'oid' },
    { title: '支付时间', dataIndex: 'payTime', key: 'payTime' },
    { title: '成交总价', dataIndex: 'dealTotalPrice', key: 'dealTotalPrice' },
  ];

  // 提交表单
  const onSubmit = () => form.validateFields().then((values) => onFetchList(values, pagination.current, pagination.pageSize));

  return (
    <>
      <Form form={form} layout="inline" onFinish={onSubmit}>
        <Form.Item name="dateRange" label="时间范围">
          <RangePicker />
        </Form.Item>
        <Form.Item name="shop" label="店铺">
          <Select placeholder="请选择店铺" style={{ width: 200 }}>
            <Select.Option value="shop1">店铺1</Select.Option>
            <Select.Option value="shop2">店铺2</Select.Option>
            <Select.Option value="shop3">店铺3</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="productCode" label="货品编号">
          <Input placeholder="请输入货品编号" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">确认</Button>
        </Form.Item>
      </Form>

      <ProTable
        columns={columns}
        dataSource={listData}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: onPageChange,
        }}
        rowKey="oid"
        search={false}  // 禁用ProTable自带的搜索框
      />
    </>
  );
};

const RepurchaseRate: React.FC = () => {
  const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);
  const [listDataPage1, setListDataPage1] = useState<any[]>([]);
  const [listDataPage2, setListDataPage2] = useState<any[]>([]);
  const [pagination1, setPagination1] = useState({ current: 1, pageSize: 10, total: 0 });
  const [pagination2, setPagination2] = useState({ current: 1, pageSize: 10, total: 0 });
  const [totalDataPage1, setTotalDataPage1] = useState<number>(0);
  const [totalDataPage2, setTotalDataPage2] = useState<number>(0);
  const [formValues, setFormValues] = useState<any>({});

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  const items = steps.map((item) => ({ key: item.title, title: item.title }));

  const contentStyle: React.CSSProperties = {
    lineHeight: '260px',
    textAlign: 'center',
    color: token.colorTextTertiary,
    backgroundColor: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: `1px dashed ${token.colorBorder}`,
    marginTop: 16,
  };

  // 调用接口获取页面1的列表
  const handleFetchListPage1 = async (values: any, page: number, pageSize: number) => {
    const { dateRange, shop, productCode } = values;
    const tradeTimeParams = [{
      searchName: 'tradeTime',
      searchType: 'betweenStr',
      searchValue: Array.isArray(dateRange) && dateRange.length > 0 
        ? dateRange.map(date => dayjs(date).format('YYYY-MM-DD')).join(',') 
        : '',
    }];
    const restParams = encodeURIComponent(JSON.stringify(tradeTimeParams));

    setFormValues(values); // 缓存表单数据

    try {
      const response = await salesOutDetails({ page, pageSize, restParams });
      if (response?.data && response?.total) {
        setListDataPage1(response.data);
        setPagination1({ current: page, pageSize, total: response.total });
        setTotalDataPage1(response.total); // 保存页面1的总数
        message.success('页面1列表获取成功');
      } else {
        message.error('数据结构不正确');
      }
    } catch (error) {
      message.error('获取列表失败');
    }
  };

  // 调用接口获取页面2的列表
  const handleFetchListPage2 = async (values: any, page: number, pageSize: number) => {
    const { dateRange, shop, productCode } = values;
    const tradeTimeParams = [{
      searchName: 'tradeTime',
      searchType: 'betweenStr',
      searchValue: Array.isArray(dateRange) && dateRange.length > 0 
        ? dateRange.map(date => dayjs(date).format('YYYY-MM-DD')).join(',') 
        : '',
    }];
    const restParams = encodeURIComponent(JSON.stringify(tradeTimeParams));

    setFormValues(values); // 缓存表单数据

    try {
      const response = await salesOutDetails({ page, pageSize, restParams });
      if (response?.data && response?.total) {
        setListDataPage2(response.data);
        setPagination2({ current: page, pageSize, total: response.total });
        setTotalDataPage2(response.total); // 保存页面2的总数
        message.success('页面2列表获取成功');
      } else {
        message.error('数据结构不正确');
      }
    } catch (error) {
      message.error('获取列表失败');
    }
  };

  // 分页变化处理，根据不同页面调用不同的接口
  const handlePageChangePage1 = (page: number, pageSize: number) => handleFetchListPage1(formValues, page, pageSize);
  const handlePageChangePage2 = (page: number, pageSize: number) => handleFetchListPage2(formValues, page, pageSize);

  return (
    <>
      <Steps current={current} items={items} />
      <div style={contentStyle}>
        {current === 0 && (
          <ListAndFilterForm
            onFetchList={handleFetchListPage1}
            listData={listDataPage1}
            pagination={pagination1}
            onPageChange={handlePageChangePage1}
          />
        )}

        {current === 1 && (
          <ListAndFilterForm
            onFetchList={handleFetchListPage2}
            listData={listDataPage2}
            pagination={pagination2}
            onPageChange={handlePageChangePage2}
          />
        )}

        {current > 1 && (
          <div>
            <Form layout="vertical">
                <Form.Item label={`页面1数据总数`}>
                    <Input value={totalDataPage1} />
                </Form.Item>
                <Form.Item label={`页面2数据总数`}>
                    <Input value={totalDataPage2} />
                </Form.Item>
            </Form>
            {/* 显示页面1和页面2的表格数据（空） */}
            <ProTable
              columns={[
                { title: '订单号', dataIndex: 'oid', key: 'oid' },
                { title: '支付时间', dataIndex: 'payTime', key: 'payTime' },
                { title: '成交总价', dataIndex: 'dealTotalPrice', key: 'dealTotalPrice' },
              ]}
              dataSource={[]} // 数据为空
              pagination={false} // 不需要分页
              rowKey="oid"
              search={false} // 禁用ProTable自带的搜索框
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        {current < steps.length - 1 && (
          <Button type="primary" onClick={next}>Next</Button>
        )}
        {current === steps.length - 1 && (
          <Button type="primary" onClick={() => message.success('Processing complete!')}>Done</Button>
        )}
        {current > 0 && (
          <Button style={{ margin: '0 8px' }} onClick={prev}>Previous</Button>
        )}
      </div>
    </>
  );
};

export default RepurchaseRate
