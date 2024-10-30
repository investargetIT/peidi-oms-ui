import { shopTarget, salesOutDetailsPage, salesOutDetails, salesOutDetailsRepeatPage } from '@/services/ant-design-pro/api';
import React, { useState, useEffect } from 'react';
import { Button, message, Steps, theme, Select, DatePicker, Input, Form, Table } from 'antd';
const { RangePicker } = DatePicker; // 导入 RangePicker
import dayjs from 'dayjs';
import { ProTable } from '@ant-design/pro-components';
import { debounce } from 'lodash';

// 步骤定义
const steps = [
  { title: 'A订单页', content: 'First-content' },
  { title: 'B订单页', content: 'Second-content' },
  { title: '用户复购率页', content: 'Last-content' },
];

// 表单和表格组件
const ListAndFilterForm: React.FC<{ 
  onFetchList: (values: any, page: number, pageSize: number) => void, 
  listData: any[], 
  pagination: any, 
  onPageChange: (page: number, pageSize: number) => void,
  initialValues: any // 用于表单初始化
}> = ({ onFetchList, listData, pagination, onPageChange, initialValues }) => {
  const [form] = Form.useForm();
  const [shopList, setShopList] = useState<any[]>([]);
  const [orderDetailsMap, setOrderDetailsMap] = useState<{ [key: string]: any[] }>({}); // 存储每个收件人的订单信息
  const [loading, setLoading] = useState<boolean>(false);
  const [subLoading, setSubLoading] = useState<boolean>(false);

  // 初始化表单数据
  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues]);

  // 获取店铺数据
  useEffect(() => {
    const fetchShopList = async () => {
      try {
        const response = await shopTarget();
        if (response?.data) {
          setShopList(response.data); // 存储店铺列表
        } else {
          message.error('获取店铺列表失败');
        }
      } catch (error) {
        message.error('调用shopTarget接口失败');
      }
    };

    fetchShopList();
  }, []);

  // 表格的列定义
  const columns = [
    {
      title: '收件人',
      dataIndex: 'receiverName',
      key: 'receiverName',
    },
    { title: '收件人手机', dataIndex: 'receiverMobile', key: 'receiverMobile' },
    { title: '收货地区', dataIndex: 'receiverArea', key: 'receiverArea' },
    { title: '收货地址', dataIndex: 'receiverAddress', key: 'receiverAddress' },
  ];

  // 提交表单
  const onSubmit = debounce(
    () => form.validateFields()
      .then((values) => {
        setLoading(true);
        return onFetchList(values, pagination.current, pagination.pageSize)
      })
      .then(() => setLoading(false)),
    300
  );

  // 获取订单详情
  const fetchOrderDetails = async (record: any, formValues: any) => {
    setSubLoading(true);
    const { dateRange, shopName, goodsNo } = formValues;
    const { receiverName, receiverMobile, receiverArea, receiverAddress } = record;
    
    // 构建搜索条件数组
    const searchConditions = [
      {
        searchName: 'tradeTime',
        searchType: 'betweenStr',
        searchValue: Array.isArray(dateRange) && dateRange.length > 0
          ? [
            dayjs(dateRange[0]).format('YYYY-MM-DD 00:00:00'), // 起始日期加上 00:00:00
            dayjs(dateRange[1]).format('YYYY-MM-DD 23:59:59')  // 结束日期加上 23:59:59
          ].join(',')
          : '',
      },
      { searchName: 'shopName', searchType: 'like', searchValue: shopName || '' },
      { searchName: 'goodsNo', searchType: 'like', searchValue: goodsNo || '' },
      { searchName: 'receiverName', searchType: 'like', searchValue: receiverName || '' },
      { searchName: 'receiverMobile', searchType: 'like', searchValue: receiverMobile || '' },
      { searchName: 'receiverArea', searchType: 'like', searchValue: receiverArea || '' },
      { searchName: 'receiverAddress', searchType: 'like', searchValue: receiverAddress || '' },
    ];
  
    // 将搜索条件数组转换为字符串
    const searchStr = encodeURIComponent(JSON.stringify(searchConditions));
  
    // 调用 salesOutDetails 接口
    const response = await salesOutDetails({ searchStr });
    setSubLoading(false);
    try {
      if (response?.data) {
        // 成功时存储订单信息
        setOrderDetailsMap(prev => ({
          ...prev, 
          [`${receiverName}-${receiverMobile}-${receiverArea}-${receiverAddress}`]: response.data 
        }));
      } else {
        message.error('获取订单详情失败');
      }
    } catch (error) {
      message.error('调用salesOutDetails接口失败');
    }
  };

  return (
    <>
      <Form form={form} layout="inline" onFinish={onSubmit}>
        <Form.Item name="dateRange" label="时间范围">
          <RangePicker placeholder={[ '开始日期', '结束日期' ]} />
        </Form.Item>
        <Form.Item name="shopName" label="店铺">
          <Select placeholder="请选择店铺" style={{ width: 400 }} allowClear>
            {shopList.map((shop) => (
              <Select.Option key={shop.wdtName} value={shop.wdtName}>
                {shop.shopName}<span style={{ marginLeft: 10, color: '#cccccc' }}>{shop.channel}</span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="goodsNo" label="货品编号">
          <Input placeholder="请输入货品编号" />
        </Form.Item>
        <Form.Item name="receiverArea" label="地区">
          <Input placeholder="请输入地区" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" disabled={loading}>确认</Button>
        </Form.Item>
      </Form>

      <ProTable
        loading={loading}
        columns={columns}
        dataSource={listData}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: onPageChange,
        }}
        rowKey="id"
        expandable={{
          onExpand: (expanded, record) => {
            if (expanded) {
              // 展开时获取订单详情
              fetchOrderDetails(record, form.getFieldsValue());
            }
          },
          expandedRowRender: (record) => {
            const key = `${record.receiverName}-${record.receiverMobile}-${record.receiverArea}-${record.receiverAddress}`;
            return (
              <Table
                loading={subLoading}
                columns={[
                  { title: '订单号', dataIndex: 'oid', key: 'oid' },
                  { title: '商品名称', dataIndex: 'goodsName', key: 'goodsName' },
                  { title: '成交总价', dataIndex: 'paid', key: 'paid' },
                ]}
                dataSource={orderDetailsMap[key] || []} // 根据收件人信息获取对应的订单详情
                rowKey="id"
                pagination={false} // 不需要分页
              />
            );
          },
        }}
        search={false}  // 禁用ProTable自带的搜索框
      />
    </>
  );
};

const buildTradeTimeParams = (values: any) => {
  const { dateRange, shopName, goodsNo, receiverArea } = values;
  return [
    {
      searchName: 'tradeTime',
      searchType: 'betweenStr',
      searchValue: Array.isArray(dateRange) && dateRange.length > 0
        ? [
          dayjs(dateRange[0]).format('YYYY-MM-DD 00:00:00'), // 起始日期加上 00:00:00
          dayjs(dateRange[1]).format('YYYY-MM-DD 23:59:59')  // 结束日期加上 23:59:59
        ].join(',')
        : '',
    },
    { searchName: 'shopName', searchType: 'like', searchValue: shopName || '' },
    { searchName: 'goodsNo', searchType: 'like', searchValue: goodsNo || '' },
    { searchName: 'receiverArea', searchType: 'like', searchValue: receiverArea || '' },
  ];
};

const RepurchaseRate: React.FC = () => {
  const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);
  const [listDataPage1, setListDataPage1] = useState<any[]>([]);
  const [listDataPage2, setListDataPage2] = useState<any[]>([]);
  const [repurchaseData, setRepurchaseData] = useState<any[]>([]); // 新增字段存储用户复购率数据
  const [pagination1, setPagination1] = useState({ current: 1, pageSize: 10, total: 0 });
  const [pagination2, setPagination2] = useState({ current: 1, pageSize: 10, total: 0 });
  const [paginationRepurchase, setPaginationRepurchase] = useState({ current: 1, pageSize: 10, total: 0 }); // 新增分页状态
  const [formValuesPage1, setFormValuesPage1] = useState<any>({});
  const [formValuesPage2, setFormValuesPage2] = useState<any>();
  const totalA = pagination1.total; // A 订单页的总数
  const totalB = pagination2.total; // B 订单页的总数
  const totalC = paginationRepurchase.total; // 用户复购率页的总数
  const totalAll = parseFloat((totalC / totalA).toFixed(2)); // 用户复购率
  const [loading, setLoading] = useState<boolean>(false);

  
  const [searchStr, setSearchStr] = useState<string>(''); // 新增字段保存搜索条件
  const [orderDetailsMap, setOrderDetailsMap] = useState<{ [key: string]: any[] }>({}); // 新增 orderDetailsMap 用于存储订单详情


  const next = async () => {
    if (current === 0) {
      // 保存 A 订单页的搜索条件
      setSearchStr(encodeURIComponent(JSON.stringify(buildTradeTimeParams(formValuesPage1))));
    } else if (current === 1) {
      // 保存 B 订单页的搜索条件
      setSearchStr(encodeURIComponent(JSON.stringify(buildTradeTimeParams(formValuesPage2))));
    }
    setCurrent(current + 1);
  };

  const prev = () => setCurrent(current - 1);

  const items = steps.map((item) => ({ key: item.title, title: item.title }));

  const contentStyle: React.CSSProperties = {
    lineHeight: '50px',
    textAlign: 'center',
    color: token.colorTextTertiary,
    backgroundColor: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: `1px dashed ${token.colorBorder}`,
    marginTop: 16,
  };

  const handleFetchListPage1 = async (values: any, page: number, pageSize: number) => {
    const tradeTimeParams = buildTradeTimeParams(values);
    const searchStr = encodeURIComponent(JSON.stringify(tradeTimeParams));
    const groupStr = 'receiverName,receiverMobile,receiverArea,receiverAddress';
    setFormValuesPage1(values);
    try {
      const response = await salesOutDetailsPage({
        page,
        pageSize,
        searchStr,
        groupStr,
      });
      if (response?.success) {
        setListDataPage1(response.data.records);
        setPagination1({ current: page, pageSize, total: response.data.total });
        message.success('A订单页列表获取成功');
      } else {
        message.error('A订单页列表获取失败 ' + response.msg);
      }
    } catch (error) {
      message.error('获取列表失败');
    }
  };

  const handleFetchListPage2 = async (values: any, page: number, pageSize: number) => {
    const tradeTimeParams = buildTradeTimeParams(values);
    const searchStr = encodeURIComponent(JSON.stringify(tradeTimeParams));
    const groupStr = 'receiverName,receiverMobile,receiverArea,receiverAddress';
    setFormValuesPage2(values);

    try {
      const response = await salesOutDetailsPage({
        page,
        pageSize,
        searchStr,
        groupStr,
      });

      if (response?.success) {
        setListDataPage2(response.data.records);
        setPagination1({ current: page, pageSize, total: response.data.total });
        message.success('B订单页列表获取成功');
      } else {
        message.error('B订单页列表获取失败 ' + response.msg);
      }
    } catch (error) {
      message.error('获取列表失败');
    }
  };

  const handlePageChangePage1 = (page: number, pageSize: number) => handleFetchListPage1(formValuesPage1, page, pageSize);
  const handlePageChangePage2 = (page: number, pageSize: number) => handleFetchListPage2(formValuesPage2, page, pageSize);

  // const buildTradeTimeParamsAll = (values1: any, values2: any) => {
  //   const { dateRange: dateRange1, shopName: shopName1, goodsNo: goodsNo1, receiverArea: receiverArea1 } = values1;
  //   const { dateRange: dateRange2, shopName: shopName2, goodsNo: goodsNo2, receiverArea: receiverArea2 } = values2;

  //   return [
  //     {
  //       searchName: 'tradeTime',
  //       searchType: 'betweenStr',
  //       searchValue: Array.isArray(dateRange1) && dateRange1.length > 0
  //         ? dateRange1.map(date => dayjs(date).format('YYYY-MM-DD')).join(',')
  //         : '',
  //     },
  //     { searchName: 'shopName', searchType: 'like', searchValue: shopName1 || '' },
  //     { searchName: 'goodsNo', searchType: 'like', searchValue: goodsNo1 || '' },
  //     { searchName: 'receiverArea', searchType: 'like', searchValue: receiverArea1 || '' },
  //     {
  //       searchName: 'tradeTime',
  //       searchType: 'betweenStr',
  //       searchValue: Array.isArray(dateRange2) && dateRange2.length > 0
  //         ? dateRange2.map(date => dayjs(date).format('YYYY-MM-DD')).join(',')
  //         : '',
  //     },
  //     { searchName: 'shopName', searchType: 'like', searchValue: shopName2 || '' },
  //     { searchName: 'goodsNo', searchType: 'like', searchValue: goodsNo2 || '' },
  //     { searchName: 'receiverArea', searchType: 'like', searchValue: receiverArea2 || '' }
  //   ];
  // };

  // 新增用户复购率页的获取数据函数
  const handleFetchRepurchaseRate = async (page, pageSize) => {
    setLoading(true);
    // 获取 A订单页和 B订单页的搜索条件
    const tradeTimeParamsA = buildTradeTimeParams(formValuesPage1);
    const tradeTimeParamsB = buildTradeTimeParams(formValuesPage2);
    const searchParamsAll = [tradeTimeParamsA,tradeTimeParamsB]

    // 转换为字符串
    const searchStr = encodeURIComponent(JSON.stringify(searchParamsAll));
    const groupStr = 'receiverName,receiverMobile,receiverArea,receiverAddress';

    try {
      const response = await salesOutDetailsRepeatPage({
        page, // 使用当前复购页的分页信息
        pageSize,
        searchStr, // 使用保存的搜索条件
        groupStr,
      });
  
      if (response?.data && Array.isArray(response.data)) {
        // 确保 data 是有效数组
        setRepurchaseData(response.data); // 将数据存储在状态中
        setPaginationRepurchase({
          current: page,
          pageSize,
          total: response.total || 0, // 确保 total 存在
        });
        message.success('用户复购率数据获取成功');
      } else {
        message.error('数据结构不正确或数据为空');
      }
    } catch (error) {
      message.error('获取用户复购率失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('paginationRepurchase', paginationRepurchase);
    if (current === steps.length - 1) {
      handleFetchRepurchaseRate(paginationRepurchase.current, paginationRepurchase.pageSize); // 进入用户复购率页时调用数据
    }
  }, [current]);

  const repurchaseColumns = [
    { title: '收件人', dataIndex: 'receiverName', key: 'receiverName' },
    { title: '收件人手机', dataIndex: 'receiverMobile', key: 'receiverMobile' },
    { title: '收货地区', dataIndex: 'receiverArea', key: 'receiverArea' },
    { title: '收货地址', dataIndex: 'receiverAddress', key: 'receiverAddress' },
  ];
  
  // // 获取订单详情的函数
  // const fetchOrderDetails = async (record) => {
  //   const { receiverName, receiverMobile, receiverArea, receiverAddress } = record;

  //   // 获取 A 订单页和 B 订单页的搜索条件
  //   const searchParamsA = buildTradeTimeParams(formValuesPage1);
  //   const searchParamsB = buildTradeTimeParams(formValuesPage2);


  //   // 将收件人信息添加到 A\B 订单页的搜索条件中
  //   searchParamsA.push(
  //     { searchName: 'receiverName', searchType: 'like', searchValue: receiverName },
  //     { searchName: 'receiverMobile', searchType: 'like', searchValue: receiverMobile },
  //     { searchName: 'receiverAddress', searchType: 'like', searchValue: receiverAddress }
  //   );

  //   searchParamsB.push(
  //     { searchName: 'receiverName', searchType: 'like', searchValue: receiverName },
  //     { searchName: 'receiverMobile', searchType: 'like', searchValue: receiverMobile },
  //     { searchName: 'receiverAddress', searchType: 'like', searchValue: receiverAddress }
  //   );

  //   const searchParamsAll = [searchParamsA,searchParamsB]

  //   // 转换为字符串
  //   const searchStr = encodeURIComponent(JSON.stringify(searchParamsAll));
  //   try {
  //     const response = await salesOutDetails({ searchStr });
  //     if (response?.data) {
  //       return response.data; // 返回订单详情数据
  //     } else {
  //       message.error('获取订单详情失败');
  //     }
  //   } catch (error) {
  //     message.error('调用salesOutDetails接口失败');
  //   }
  // };
  
  // const RepurchaseRate = () => {
  //   const [orderDetailsMap, setOrderDetailsMap] = useState({}); // 存储订单详情
    
  //   // 展开行的渲染
  //   const expandedRowRender = (record) => {
  //     const key = `${record.receiverName}-${record.receiverMobile}-${record.receiverArea}-${record.receiverAddress}`;
  //     return (
  //       <Table
  //         columns={[
  //           { title: '订单号', dataIndex: 'oid', key: 'oid' },
  //           { title: '商品名称', dataIndex: 'goodsName', key: 'goodsName' },
  //           { title: '成交总价', dataIndex: 'paid', key: 'paid' },
  //         ]}
  //         dataSource={orderDetailsMap[key] || []} // 根据收件人信息获取对应的订单详情
  //         rowKey="id"
  //         pagination={false} // 不需要分页
  //       />
  //     );
  //   };
  
  //   // 处理展开事件
  //   const handleExpand = async (expanded, record) => {
  //     if (expanded) {
  //       const key = `${record.receiverName}-${record.receiverMobile}-${record.receiverArea}-${record.receiverAddress}`;
        
  //       // 如果当前收件人没有订单详情，则调用接口获取
  //       if (!orderDetailsMap[key]) {
  //         const orderDetails = await fetchOrderDetails(record);
  //         setOrderDetailsMap(prev => ({ ...prev, [key]: orderDetails }));
  //       }
  //     }
  //   };
  
  //   return (
  //     <ProTable
  //       columns={repurchaseColumns}
  //       dataSource={repurchaseData} // 假设 repurchaseData 存储了列表数据
  //       rowKey="id"
  //       expandable={{
  //         expandedRowRender, // 渲染展开的内容
  //         onExpand: handleExpand, // 触发展开时调用
  //         expandIconColumnIndex: 0, // 设置加号列的位置
  //       }}
  //       pagination={{
  //         current: paginationRepurchase.current,
  //         pageSize: paginationRepurchase.pageSize,
  //         total: paginationRepurchase.total,
  //         onChange: (page, pageSize) => setPaginationRepurchase({ current: page, pageSize, total: paginationRepurchase.total }),
  //       }}
  //     />
  //   );
  // };
  
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
            initialValues={formValuesPage1}
          />
        )}

        {current === 1 && (
          <ListAndFilterForm
            onFetchList={handleFetchListPage2}
            listData={listDataPage2}
            pagination={pagination2}
            onPageChange={handlePageChangePage2}
            initialValues={formValuesPage2}
          />
        )}
        {current === 2 && ( // 用户复购率页
        <>
          <div style={{ marginBottom: 16 }}>
            <div>
              <span>A 订单用户人数：{totalA}</span>
              <span style={{ marginLeft: 20 }}>B 订单用户人数：{totalB}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <span>复购用户人数：{totalC}</span>
              {/* <span style={{ marginLeft: 20 }}>用户复购率: {totalAll}%</span> */}
            </div>
          </div>

          <ProTable
            loading={loading}
            columns={repurchaseColumns}
            dataSource={repurchaseData}
            pagination={{
              current: paginationRepurchase.current,
              pageSize: paginationRepurchase.pageSize,
              total: paginationRepurchase.total,
              onChange: (page, pageSize) => handleFetchRepurchaseRate(page, pageSize),
            }}
            rowKey="id" // 使用订单号作为唯一标识
            search={false} // 隐藏搜索框
            // expandable={{
            //   expandedRowRender: (record) => (
            //     <Table
            //       columns={[
            //         { title: '订单号', dataIndex: 'oid', key: 'oid' },
            //         { title: '商品名称', dataIndex: 'goodsName', key: 'goodsName' },
            //         { title: '成交总价', dataIndex: 'paid', key: 'paid' },
            //       ]}
            //       dataSource={orderDetailsMap[`${record.receiverName}-${record.receiverMobile}`] || []} // 根据收件人获取订单详情
            //       rowKey="id"
            //       pagination={false}
            //     />
            //   ),
            //   onExpand: async (expanded, record) => {
            //     if (expanded) {
            //       const key = `${record.receiverName}-${record.receiverMobile}`;
            //       if (!orderDetailsMap[key]) {
            //         const orderDetails = await fetchOrderDetails(record); // 调用获取订单详情的函数
            //         setOrderDetailsMap(prev => ({ ...prev, [key]: orderDetails })); // 更新状态
            //       }
            //     }
            //   },
            //   expandIconColumnIndex: 0, // 确保加号显示在第一列
            // }}
          />
          </>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        {current < steps.length - 1 && (
          <Button type="primary" onClick={next}>下一页</Button>
        )}
        {current > 0 && (
          <Button style={{ margin: '0 8px' }} onClick={prev}>上一页</Button>
        )}
      </div>
    </>
  );
};

export default RepurchaseRate;
