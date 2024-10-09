import { salesOutDetails } from '@/services/ant-design-pro/api';
import React, { useState } from 'react';
import { Button, message, Steps, theme, Select, DatePicker, Input, Form, Pagination } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const steps = [
  {
    title: 'First',
    content: 'First-content',
  },
  {
    title: 'Second',
    content: 'Second-content',
  },
  {
    title: 'Last',
    content: 'Last-content',
  },
];

const App: React.FC = () => {
  const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [listData, setListData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const next = () => {
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

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

  // 调用接口
  const handleFetchList = async (values: any, page: number, pageSize: number) => {
    const { dateRange, shop, productCode } = values;
    const tradeTimeParams = [{
        searchName: 'tradeTime',
        searchType: 'between',
        searchValue: dateRange.map(date => dayjs(date).format('YYYY-MM-DD')).join('#/#'),
    }];
    console.log(tradeTimeParams);
    const restParams = encodeURIComponent(JSON.stringify(tradeTimeParams));
    console.log(restParams);
    try {
      const response = await salesOutDetails({
        page,
        pageSize,
        restParams,
      });
      console.log(response)
      setListData(response.list); // 假设接口返回的数据包含 `list` 字段
      setPagination({ page, pageSize, total: response.total }); // 假设接口返回 `total` 字段
      message.success('列表获取成功');
    } catch (error) {
      console.error('Error fetching list:', error);
      message.error('获取列表失败');
    }
  };

  // 提交表单
  const onSubmit = () => {
    form.validateFields().then((values) => {
      handleFetchList(values, pagination.current, pagination.pageSize);
    });
  };

  const handlePageChange = (page: number, pageSize: number) => {
    form.validateFields().then((values) => {
      handleFetchList(values, page, pageSize);
    });
  };

  return (
    <>
      <Steps current={current} items={items} />
      <div style={contentStyle}>
        {current === 0 && (
          <Form form={form} layout="inline" onFinish={onSubmit}>
            <Form.Item name="dateRange" label="时间范围" >
              <RangePicker />
            </Form.Item>
            <Form.Item name="shop" label="店铺" rules={[{ message: '请选择店铺' }]}>
              <Select placeholder="请选择店铺" style={{ width: 200 }}>
                <Select.Option value="shop1">店铺1</Select.Option>
                <Select.Option value="shop2">店铺2</Select.Option>
                <Select.Option value="shop3">店铺3</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="productCode" label="货品编号" rules={[{ message: '请输入货品编号' }]}>
              <Input placeholder="请输入货品编号" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                确认
              </Button>
            </Form.Item>
          </Form>
        )}

        {listData.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3>返回列表：</h3>
            <ul>
              {listData.map((item, index) => (
                <li key={index}>{item.name}</li> // 假设返回的数据包含 `name` 字段
              ))}
            </ul>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
            />
          </div>
        )}

        {current > 0 && <div>{steps[current].content}</div>}
      </div>
      <div style={{ marginTop: 24 }}>
        {current < steps.length - 1 && (
          <Button type="primary" onClick={() => next()}>
            Next
          </Button>
        )}
        {current === steps.length - 1 && (
          <Button type="primary" onClick={() => message.success('Processing complete!')}>
            Done
          </Button>
        )}
        {current > 0 && (
          <Button style={{ margin: '0 8px' }} onClick={() => prev()}>
            Previous
          </Button>
        )}
      </div>
    </>
  );
};

export default App;
