import { addCustomer, removeCustomer, customer, updateCustomer } from '@/services/ant-design-pro/api';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns, ProDescriptionsItemProps } from '@ant-design/pro-components';
import {
  FooterToolbar,
  ModalForm,
  PageContainer,
  ProDescriptions,
  ProFormText,
  ProFormTextArea,
  ProTable,
  StepsForm,
  ProFormSelect,
  ProFormDatePicker,
} from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Input, message, Modal } from 'antd';
import React, { useRef, useState } from 'react';
import type { FormValueType } from './components/UpdateForm.tsx';
import UpdateForm from './components/UpdateForm.tsx';

const Customer: React.FC = () => {
  /**
   * @en-US Pop-up window of new window
   * @zh-CN 新建窗口的弹窗
   *  */
  const [createModalOpen, handleModalOpen] = useState<boolean>(false);
  /**
   * @en-US The pop-up window of the distribution update window
   * @zh-CN 分布更新窗口的弹窗
   * */
  const [updateModalOpen, handleUpdateModalOpen] = useState<boolean>(false);

  const [showDetail, setShowDetail] = useState<boolean>(false);

  const actionRef = useRef<ActionType>();
  const [currentRow, setCurrentRow] = useState<API.CustomerListItem>();
  const [selectedRowsState, setSelectedRows] = useState<API.CustomerListItem[]>([]);

  /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */
  const intl = useIntl();

  const columns: ProColumns<API.CustomerListItem>[] = [
    {
      title: <FormattedMessage id="pages.searchcustomer.code" defaultMessage="Description" />,
      dataIndex: 'code',
      valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchcustomer.name" defaultMessage="Description" />,
      dataIndex: 'name',
      valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.province" defaultMessage="Description" />,
        dataIndex: 'province',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.city" defaultMessage="Description" />,
        dataIndex: 'city',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.district" defaultMessage="Description" />,
        dataIndex: 'district',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.address" defaultMessage="Description" />,
        dataIndex: 'address',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.contact" defaultMessage="Description" />,
        dataIndex: 'contact',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.telephone" defaultMessage="Description" />,
        dataIndex: 'telephone',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.status" defaultMessage="Description" />,
        dataIndex: 'status',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.brand" defaultMessage="Description" />,
        dataIndex: 'brand',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.attribute" defaultMessage="Description" />,
        dataIndex: 'attribute',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceType" defaultMessage="Description" />,
        dataIndex: 'invoiceType',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitle" defaultMessage="Description" />,
        dataIndex: 'invoiceTitle',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitleTin" defaultMessage="Description" />,
        dataIndex: 'invoiceTitleTin',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitleAddress" defaultMessage="Description" />,
        dataIndex: 'invoiceTitleAddress',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitleBank" defaultMessage="Description" />,
        dataIndex: 'invoiceTitleBank',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitleBankAccount" defaultMessage="Description" />,
        dataIndex: 'invoiceTitleBankAccount',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceTitleTelephone" defaultMessage="Description" />,
        dataIndex: 'invoiceTitleTelephone',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceReceiver" defaultMessage="Description" />,
        dataIndex: 'invoiceReceiver',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceReceiverTel" defaultMessage="Description" />,
        dataIndex: 'invoiceReceiverTel',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceReceiverAddress" defaultMessage="Description" />,
        dataIndex: 'invoiceReceiverAddress',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.invoiceReceiverEmail" defaultMessage="Description" />,
        dataIndex: 'invoiceReceiverEmail',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchcustomer.remark" defaultMessage="Description" />,
        dataIndex: 'remark',
        valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchcustomer.operation" defaultMessage="Operating" />,
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="config"
          className="colortext"
          onClick={() => {
            handleUpdateModalOpen(true);
            setCurrentRow(record);
          }}
        >
          <FormattedMessage id="pages.searchcustomer.operation.edit" defaultMessage="Configuration" />
        </a>,
        !showDetail && (
            <a
            className="colortext"
            onClick={() => {
              setCurrentRow(record);
              setShowDetail(true);
            }}
          >
            <FormattedMessage id="pages.searchcustomer.operation.details" defaultMessage="Configuration" />
          </a>
        )
      ],
    },
  ];

  /**
 * @en-US Add node
 * @zh-CN 添加节点
 * @param fields
 */
  const handleAdd = async (fields: API.CustomerListItem) => {
    const hide = message.loading('正在添加');
    try {
      await addCustomer({ ...fields });
      hide();
      message.success('Added successfully');
      return true;
    } catch (error) {
      hide();
      message.error('Adding failed, please try again!');
      return false;
    }
  };

  /**
   * @en-US Update node
   * @zh-CN 更新节点
   *
   * @param fields
   */
  const handleUpdate = async (fields: FormValueType) => {
    const hide = message.loading('Configuring');
    const id = fields.id;
    const values = {
      id: fields.id,
      code: fields.code,
      name: fields.name,
      province: fields.province,
      city: fields.city,
      district: fields.district,
      address: fields.address,
      contact: fields.contact,
      telephone: fields.telephone,
      status: fields.status,
      brand: fields.brand,
      attribute: fields.attribute,
      invoiceType: fields.invoiceType,
      invoiceTitle: fields.invoiceTitle,
      invoiceTitleTin: fields.invoiceTitleTin,
      invoiceTitleAddress: fields.invoiceTitleAddress,
      invoiceTitleBank: fields.invoiceTitleBank,
      invoiceTitleBankAccount: fields.invoiceTitleBankAccount,
      invoiceTitleTelephone: fields.invoiceTitleTelephone,
      invoiceReceiver: fields.invoiceReceiver,
      invoiceReceiverTel: fields.invoiceReceiverTel,
      invoiceReceiverAddress: fields.invoiceReceiverAddress,
      invoiceReceiverEmail: fields.invoiceReceiverEmail,
      remark: fields.remark,
    }
    try {
      await updateCustomer(id, values);
      hide();
      message.success('Configuration is successful');
      return true;
    } catch (error) {
      hide();
      message.error('Configuration failed, please try again!');
      return false;
    }
  };

  /**
   *  Delete node
   * @zh-CN 删除节点
   *
   * @param selectedRows
   */
  const handleRemove = async (selectedRows: API.CustomerListItem[]) => {
    Modal.confirm({
      title: <FormattedMessage id="pages.searchsupplier.deleteConfirmTitle" defaultMessage="确认删除" />,
      content: <FormattedMessage id="pages.searchsupplier.deleteConfirmContent" defaultMessage="确定要删除吗？" />,
      okText: <FormattedMessage id="pages.searchsupplier.deleteConfirmOk" defaultMessage="确认删除" />,
      cancelText: <FormattedMessage id="pages.searchsupplier.deleteConfirmCancel" defaultMessage="取消" />,
      onOk: async () => {
        const hide = message.loading('正在删除');
        if (!selectedRows) return true;
        const ids = selectedRows.map((row) => row.id);
        try {
          await removeCustomer(ids);
          hide();
          message.success('删除成功');
          setSelectedRows([]);
          actionRef.current?.reloadAndRest?.();
          return true;
        } catch (error) {
          hide();
          message.error('Delete failed, please try again');
          return false;
        }
      }
    });
  };

  return (
    <PageContainer>
      <ProTable<API.CustomerListItem, API.PageParams>
        headerTitle={intl.formatMessage({
          id: 'pages.searchcustomer.title',
          defaultMessage: 'Enquiry form',
        })}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              handleModalOpen(true);
            }}
          >
            <PlusOutlined /> <FormattedMessage id="pages.searchcustomer.new" defaultMessage="New" />
          </Button>,
        ]}
        request={customer}
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
        pagination={{ showSizeChanger: true, showQuickJumper: true }}
      />
      {selectedRowsState?.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              <FormattedMessage id="pages.searchcustomer.chosen" defaultMessage="Chosen" />{' '}
              <a style={{ fontWeight: 600 }}>{selectedRowsState.length}</a>{' '}
              <FormattedMessage id="pages.searchcustomer.item" defaultMessage="项" />
              {/* &nbsp;&nbsp;
              <span>
                <FormattedMessage
                  id="pages.searchTable.totalServiceCalls"
                  defaultMessage="Total number of service calls"
                />{' '}
                {selectedRowsState.reduce((pre, item) => pre + item.callNo!, 0)}{' '}
                <FormattedMessage id="pages.searchsupplier.tenThousand" defaultMessage="万" />
              </span> */}
            </div>
          }
        >
          <Button
            onClick={() => handleRemove(selectedRowsState)}
          >
            <FormattedMessage
              id="pages.searchcustomer.batchDeletion"
              defaultMessage="Batch deletion"
            />
          </Button>
          {/* <Button type="primary">
            <FormattedMessage
              id="pages.searchTable.batchApproval"
              defaultMessage="Batch approval"
            />
          </Button> */}
        </FooterToolbar>
      )}
      <ModalForm
        title={intl.formatMessage({
          id: 'pages.searchcustomer.createForm.newInfo',
          defaultMessage: '新建信息',
        })}
        width="400px"
        open={createModalOpen}
        onOpenChange={handleModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as API.CustomerListItem);
          if (success) {
            handleModalOpen(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
      <ProFormText
      name="code"
      label={intl.formatMessage({
          id: 'pages.searchcustomer.code',
          defaultMessage: '编码',
      })}
      width="md"
      rules={[
          {
          required: true,
          message: (
              <FormattedMessage
              id="pages.searchcustomer.code"
              defaultMessage="请输入编码！"
              />
          ),
          },
      ]}
      />
        <ProFormText
        name="name"
        label={intl.formatMessage({
            id: 'pages.searchcustomer.name',
            defaultMessage: '名称',
        })}
        width="md"
        rules={[
            {
            required: true,
            message: (
                <FormattedMessage
                id="pages.searchcustomer.name"
                defaultMessage="请输入名称！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="province"
        label={intl.formatMessage({
            id: 'pages.searchcustomer.province',
            defaultMessage: '省',
        })}
        width="md"
        rules={[
            {
            // required: true,
            message: (
                <FormattedMessage
                id="pages.searchcustomer.province"
                defaultMessage="请输入省！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="city"
        label={intl.formatMessage({
            id: 'pages.searchcustomer.city',
            defaultMessage: '市',
        })}
        width="md"
        rules={[
            {
            // required: true,
            message: (
                <FormattedMessage
                id="pages.searchcustomer.city"
                defaultMessage="请输入市"
                />
            ),
            },
        ]}
        />
        <ProFormText
            name="district"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.district',
              defaultMessage: '区',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.district"
                    defaultMessage="请输入区！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="address"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.address',
              defaultMessage: '地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.address"
                    defaultMessage="请输入地址！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="contact"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.contact',
              defaultMessage: '联系人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.contact"
                    defaultMessage="请输入联系人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="telephone"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.telephone',
              defaultMessage: '联系电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.telephone"
                    defaultMessage="请输入联系电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="status"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.status',
              defaultMessage: '状态',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.status"
                    defaultMessage="请输入状态！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="brand"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.brand',
              defaultMessage: '品牌',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.brand"
                    defaultMessage="请输入品牌！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="attribute"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.attribute',
              defaultMessage: '门店性质',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.attribute"
                    defaultMessage="请输入门店性质！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceType"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceType',
              defaultMessage: '发票类型',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceType"
                    defaultMessage="请输入发票类型！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitle"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitle',
              defaultMessage: '发票抬头',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitle"
                    defaultMessage="请输入发票抬头！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleTin"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleTin',
              defaultMessage: '纳税人识别号',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleTin"
                    defaultMessage="请输入纳税人识别号！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleAddress"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleAddress',
              defaultMessage: '发票地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleAddress"
                    defaultMessage="请输入发票地址！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleBank"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleBank',
              defaultMessage: '开户行',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleBank"
                    defaultMessage="请输入开户行！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleBankAccount"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleBankAccount',
              defaultMessage: '银行账号',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleBankAccount"
                    defaultMessage="请输入银行账号！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleTelephone"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleTelephone',
              defaultMessage: '发票电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleTelephone"
                    defaultMessage="请输入发票电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiver"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiver',
              defaultMessage: '收票人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiver"
                    defaultMessage="请输入收票人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiverTel"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverTel',
              defaultMessage: '收票人联系电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverTel"
                    defaultMessage="请输入收票人联系电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiverAddress"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverAddress',
              defaultMessage: '收票地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverAddress"
                    defaultMessage="请输入收票地址！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiverEmail"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverEmail',
              defaultMessage: '收票人邮箱',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverEmail"
                    defaultMessage="请输入收票人邮箱！"
                  />
                ),
              },
            ]}
          />
          <ProFormTextArea
            name="remark"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.remark',
              defaultMessage: '备注',
            })}
            // placeholder={intl.formatMessage({
            //   id: 'pages.searchcustomer.remark',
            //   defaultMessage: '请输入备注！',
            // })}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.remark"
                    defaultMessage="请输入备注！"
                  />
                ),
                // min: 5,
              },
            ]}
          />
      </ModalForm>
      {currentRow && (
        <UpdateForm
          onSubmit={async (value) => {
            const success = await handleUpdate(value);
            if (success) {
              handleUpdateModalOpen(false);
              setCurrentRow(undefined);
              if (actionRef.current) {
                actionRef.current.reload();
              }
            }
          }}
          onCancel={() => {
            handleUpdateModalOpen(false);
            if (!showDetail) {
              setCurrentRow(undefined);
            }
          }}
          updateModalOpen={updateModalOpen}
          values={currentRow || {}}
        />
      )}

      <Drawer
        width={600}
        open={showDetail}
        onClose={() => {
          setCurrentRow(undefined);
          setShowDetail(false);
        }}
        closable={false}
      >
        {currentRow?.name && (
          <ProDescriptions<API.CustomerListItem>
            column={2}
            title={currentRow?.name}
            request={async () => ({
              data: currentRow || {},
            })}
            params={{
              id: currentRow?.name,
            }}
            columns={columns as ProDescriptionsItemProps<API.CustomerListItem>[]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Customer;