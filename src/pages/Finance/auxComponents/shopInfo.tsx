import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FinanceApi from '@/services/financeApi';
import { Button, Form, FormInstance, Input, message, Modal, Radio, Table } from 'antd';

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
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
    },
    {
      title: '组织',
      dataIndex: 'org',
      key: 'org',
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
      <Table size="small" dataSource={dataSource} columns={columns} pagination={false} rowKey="id"/>

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
            rules={[{ required: true, message: '请输入渠道' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<any>
            label="平台"
            name="platform"
            rules={[{ required: true, message: '请输入平台' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<any>
            label="组织"
            name="org"
            rules={[{ required: true, message: '请输入组织' }]}
          >
            <Input />
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
        </Form>
      </Modal>
    </div>
  );
};

export default forwardRef(ShopInfo);
