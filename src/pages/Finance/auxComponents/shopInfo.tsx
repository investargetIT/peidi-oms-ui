import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FinanceApi from '@/services/financeApi';
import { Button, Form, FormInstance, Input, message, Modal, Radio, Select, Table } from 'antd';

export interface ShopInfoModalRef {
  handleShopInfoAdd: () => void;
}

const ShopInfo = (props: {}, ref: React.Ref<ShopInfoModalRef> | undefined) => {
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [isShopInfoModalOpen, setIsShopInfoModalOpen] = useState(false);
  const shopInfoFormRef = useRef<FormInstance<any>>(null);
  const [shopInfoModalTitle, setShopInfoModalTitle] = useState('新增店铺');

  //#region 请求相关
  const fetchShopPage = () => {
    FinanceApi.getShopPage()
      .then((res) => {
        if (res.code === 200 && res.data) {
          setDataSource([...res.data].reverse());
        }
      })
      .catch((error) => {
        message.error('获取店铺信息失败: ' + error);
        console.error('Failed to fetch shop page:', error);
      });
  };
  //#endregion

  //#region 操作相关
  const handleShopInfoCancel = () => {
    shopInfoFormRef.current?.resetFields();
    setIsShopInfoModalOpen(false);
  };
  const handleShopInfoAdd = () => {
    setShopInfoModalTitle('新增店铺');
    setIsShopInfoModalOpen(true);
  };
  const handleShopInfoEdit = (record: any) => {
    setShopInfoModalTitle('编辑店铺');
    setTimeout(() => {
      shopInfoFormRef.current?.setFieldsValue(record);
    }, 0);
    setIsShopInfoModalOpen(true);
  };
  // 店铺信息提交
  const handleShopInfoSubmit = async () => {
    // 先校验表单
    const values = await shopInfoFormRef.current?.validateFields();
    if (!values) {
      return;
    }
    if (shopInfoModalTitle === '新增店铺') {
      try {
        const res = await FinanceApi.postShopNew(values);
        if (res.code !== 200) {
          message.error('店铺信息新增失败: ' + res.msg);
          return;
        }
        message.success('店铺信息新增成功');
        fetchShopPage();
        handleShopInfoCancel();
      } catch (error) {
        message.error('店铺信息新增失败: ' + error);
      }
    } else {
      try {
        const res = await FinanceApi.postShopUpdate(values);
        if (res.code !== 200) {
          message.error('店铺信息修改失败: ' + res.msg);
          return;
        }
        message.success('店铺信息修改成功');
        fetchShopPage();
        handleShopInfoCancel();
      } catch (error) {
        message.error('店铺信息修改失败' + error);
      }
    }
  };
  //#endregion

  useEffect(() => {
    fetchShopPage();
  }, []);

  // 自动生成店铺名称筛选选项
  const shopNameFilters = React.useMemo(() => {
    if (!dataSource.length) return [];

    const uniqueShopNames = Array.from(
      new Set(dataSource.filter((item) => item.shopName).map((item) => item.shopName)),
    );

    return uniqueShopNames.map((name) => ({
      text: name,
      value: name,
    }));
  }, [dataSource]);
  // 自动生成渠道筛选选项
  const channelFilters = React.useMemo(() => {
    if (!dataSource.length) return [];

    const uniqueChannels = Array.from(
      new Set(dataSource.filter((item) => item.channel).map((item) => item.channel)),
    );

    return uniqueChannels.map((channel) => ({
      text: channel,
      value: channel,
    }));
  }, [dataSource]);

  // 自动生成平台筛选选项
  const platformFilters = React.useMemo(() => {
    if (!dataSource.length) return [];

    const uniquePlatforms = Array.from(
      new Set(dataSource.filter((item) => item.platform).map((item) => item.platform)),
    );

    return uniquePlatforms.map((platform) => ({
      text: platform,
      value: platform,
    }));
  }, [dataSource]);

  // 自动生成旺店通店铺名称筛选选项
  const wdtNameFilters = React.useMemo(() => {
    if (!dataSource.length) return [];

    const uniqueWdtNames = Array.from(
      new Set(dataSource.filter((item) => item.wdtName).map((item) => item.wdtName)),
    );

    return uniqueWdtNames.map((name) => ({
      text: name,
      value: name,
    }));
  }, [dataSource]);

  // 自动生成组织筛选选项
  const orgFilters = React.useMemo(() => {
    if (!dataSource.length) return [];

    const uniqueOrgs = Array.from(
      new Set(dataSource.filter((item) => item.org).map((item) => item.org)),
    );

    return uniqueOrgs.map((org) => ({
      text: org,
      value: org,
    }));
  }, [dataSource]);

  const columns: any = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '店铺名称',
      dataIndex: 'shopName',
      key: 'shopName',
      filters: shopNameFilters,
      onFilter: (value: string, record: { shopName: string | string[] }) =>
        record.shopName === value,
      filterSearch: true,
    },
    {
      title: '旺店通店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      filters: wdtNameFilters,
      onFilter: (value: string, record: { wdtName: string | string[] }) =>
        record.wdtName === value,
      filterSearch: true,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      filters: channelFilters,
      onFilter: (value: string, record: { channel: string | string[] }) => record.channel === value,
      filterSearch: true,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      filters: platformFilters,
      onFilter: (value: string, record: { platform: string | string[] }) =>
        record.platform === value,
      filterSearch: true,
    },
    {
      title: '组织',
      dataIndex: 'org',
      key: 'org',
      filters: orgFilters,
      onFilter: (value: string, record: { org: string | string[] }) => record.org === value,
      filterSearch: true,
    },
    {
      title: '团队',
      dataIndex: 'team',
      key: 'team',
      hidden: true,
    },
    {
      title: '负责人_',
      dataIndex: 'principal',
      key: 'principal',
      hidden: true,
    },
    {
      title: '负责人',
      dataIndex: 'salesman',
      key: 'salesman',
    },
    {
      title: 'DSR日期',
      dataIndex: 'dsrDate',
      key: 'dsrDate',
      hidden: true,
    },
    {
      title: '物流评分',
      dataIndex: 'logisticScore',
      key: 'logisticScore',
      hidden: true,
    },
    {
      title: '产品评分',
      dataIndex: 'productScore',
      key: 'productScore',
      hidden: true,
    },
    {
      title: '服务评分',
      dataIndex: 'serviceScore',
      key: 'serviceScore',
      hidden: true,
    },
    {
      title: '是否参与汇总',
      dataIndex: 'needSummary',
      key: 'needSummary',
      render: (value: number) =>
        value === 1 ? (
          <span style={{ color: 'green' }}>是</span>
        ) : (
          <span style={{ color: 'red' }}>否</span>
        ),
    },
    {
      title: '是否仅退款',
      dataIndex: 'needRefund',
      key: 'needRefund',
      render: (value: number) =>
        value === 1 ? (
          <span style={{ color: 'green' }}>是</span>
        ) : (
          <span style={{ color: 'red' }}>否</span>
        ),
      filters: [
        {
          text: '是',
          value: 1,
        },
        {
          text: '否',
          value: 0,
        },
      ],
      onFilter: (value: number, record: { needRefund: number }) => record.needRefund === value,
    },
    {
      title: '目标',
      dataIndex: 'target',
      key: 'target',
      hidden: true,
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
      hidden: true,
    },
    {
      title: '操作',
      dataIndex: 'operation',
      key: 'operation',
      render: (value: number, record: any) => (
        <>
          <Button type="link" size="small" onClick={() => handleShopInfoEdit(record)}>
            编辑
          </Button>
        </>
      ),
    },
  ];

  useImperativeHandle(ref, () => ({
    handleShopInfoAdd,
    fetchShopPage,
  }));

  return (
    <div>
      <Table
        size="small"
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        rowKey="id"
      />

      <Modal
        title={shopInfoModalTitle}
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isShopInfoModalOpen}
        onOk={() => {
          handleShopInfoSubmit();
        }}
        onCancel={() => {
          handleShopInfoCancel();
        }}
      >
        <Form
          ref={shopInfoFormRef}
          name="shopInfoForm"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 600 }}
          initialValues={{}}
          autoComplete="off"
        >
          <Form.Item<any> label="ID" name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item<any>
            label="店铺名称"
            name="shopName"
            rules={[{ required: true, message: '请输入店铺名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<any>
            label="旺店通店铺名称"
            name="wdtName"
            rules={[{ required: true, message: '请输入旺店通店铺名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<any>
            label="渠道"
            name="channel"
            rules={[{ required: true, message: '请选择渠道' }]}
          >
            <Select
              placeholder="请选择渠道"
              showSearch
              allowClear
              options={channelFilters.map((f) => ({ value: f.value, label: f.text }))}
            />
          </Form.Item>
          <Form.Item<any>
            label="平台"
            name="platform"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select
              placeholder="请选择平台"
              showSearch
              allowClear
              options={platformFilters.map((f) => ({ value: f.value, label: f.text }))}
            />
          </Form.Item>
          <Form.Item<any>
            label="组织"
            name="org"
            rules={[{ required: true, message: '请选择组织' }]}
          >
            <Select
              placeholder="请选择组织"
              showSearch
              allowClear
              options={[
                ...orgFilters.map((f) => ({ value: f.value, label: f.text })),
                { value: '其他', label: '其他' },
              ]}
            />
          </Form.Item>
          <Form.Item<any>
            label="负责人"
            name="salesman"
            rules={[{ required: true, message: '请输入负责人' }]}
          >
            <Input />
          </Form.Item>
          {/* 是否参与汇总 */}
          <Form.Item<any> label="是否参与汇总" name="needSummary" initialValue={1}>
            <Radio.Group>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
          {/* 是否仅退款 */}
          <Form.Item<any> label="是否仅退款" name="needRefund" initialValue={0}>
            <Radio.Group>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default forwardRef(ShopInfo);
