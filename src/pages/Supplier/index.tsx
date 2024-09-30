import { addSuppliers, removeSuppliers, suppliers, updateSuppliers } from '@/services/ant-design-pro/api';
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

const Supplier: React.FC = () => {
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
  const [currentRow, setCurrentRow] = useState<API.SuppliersListItem>();
  const [selectedRowsState, setSelectedRows] = useState<API.SuppliersListItem[]>([]);

  /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */
  const intl = useIntl();

  const columns: ProColumns<API.SuppliersListItem>[] = [
    {
      title: <FormattedMessage id="pages.searchsupplier.code" defaultMessage="Description" />,
      dataIndex: 'code',
      valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchsupplier.name" defaultMessage="Description" />,
      dataIndex: 'name',
      valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.bankAccount" defaultMessage="Description" />,
        dataIndex: 'bankAccount',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.partnershipCase" defaultMessage="Description" />,
        dataIndex: 'partnershipCase',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.attribute" defaultMessage="Description" />,
        dataIndex: 'attribute',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.mode" defaultMessage="Description" />,
        dataIndex: 'mode',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.hotel" defaultMessage="Description" />,
        dataIndex: 'hotel',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.status" defaultMessage="Description" />,
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: {
          '确认合作': { text: '确认合作' },
          '暂停合作': { text: '暂停合作' },
          '终止合作': { text: '终止合作' },
        },
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.contact" defaultMessage="Description" />,
        dataIndex: 'contact',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.position" defaultMessage="Description" />,
        dataIndex: 'position',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.telephone" defaultMessage="Description" />,
        dataIndex: 'telephone',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.salesman" defaultMessage="Description" />,
        dataIndex: 'salesman',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.contractStatus" defaultMessage="Description" />,
        dataIndex: 'contractStatus',
        valueType: 'select',
        valueEnum: {
          '确认': { text: '确认' },
          '暂停': { text: '暂停' },
          '终止': { text: '终止' },
        },
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.dealDate" defaultMessage="Description" />,
        dataIndex: 'dealDate',
        sorter: true,
        valueType: 'date',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.startDate" defaultMessage="Description" />,
        dataIndex: 'startDate',
        sorter: true,
        valueType: 'date',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.endDate" defaultMessage="Description" />,
        dataIndex: 'endDate',
        sorter: true,
        valueType: 'date',
    },
    {
        title: <FormattedMessage id="pages.searchsupplier.remark" defaultMessage="Description" />,
        dataIndex: 'remark',
        valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchsupplier.operation" defaultMessage="Operating" />,
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
          <FormattedMessage id="pages.searchsupplier.edit" defaultMessage="Configuration" />
        </a>,
        !showDetail && (
            <a
            className="colortext"
            onClick={() => {
              setCurrentRow(record);
              setShowDetail(true);
            }}
          >
            <FormattedMessage id="pages.searchsupplier.details" defaultMessage="Configuration" />
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
  const handleAdd = async (fields: API.SuppliersListItem) => {
    const hide = message.loading('正在添加');
    try {
      await addSuppliers({ ...fields });
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
      bankAccount: fields.bankAccount,
      partnershipCase: fields.partnershipCase,
      attribute: fields.attribute,
      mode: fields.mode,
      hotel: fields.hotel,
      status: fields.status,
      contact: fields.contact,
      position: fields.position,
      telephone: fields.telephone,
      salesman: fields.salesman,
      contractStatus: fields.contractStatus,
      dealDate: fields.dealDate,
      startDate: fields.startDate,
      endDate: fields.endDate,
      remark: fields.remark,
    }
    try {
      await updateSuppliers(id, values);
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
  const handleRemove = async (selectedRows: API.SuppliersListItem[]) => {
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
          await removeSuppliers(ids);
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
      <ProTable<API.SuppliersListItem, API.PageParams>
        headerTitle={intl.formatMessage({
          id: 'pages.searchsupplier.title',
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
            <PlusOutlined /> <FormattedMessage id="pages.searchsupplier.new" defaultMessage="New" />
          </Button>,
        ]}
        request={suppliers}
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
              <FormattedMessage id="pages.searchsupplier.chosen" defaultMessage="Chosen" />{' '}
              <a style={{ fontWeight: 600 }}>{selectedRowsState.length}</a>{' '}
              <FormattedMessage id="pages.searchsupplier.item" defaultMessage="项" />
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
              id="pages.searchsupplier.batchDeletion"
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
          id: 'pages.searchsupplier.createForm.newInfo',
          defaultMessage: '新建信息',
        })}
        width="400px"
        open={createModalOpen}
        onOpenChange={handleModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as API.SuppliersListItem);
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
          id: 'pages.searchsupplier.updateForm.code',
          defaultMessage: '编码',
      })}
      width="md"
      rules={[
          {
          // required: true,
          message: (
              <FormattedMessage
              id="pages.searchsupplier.updateForm.code"
              defaultMessage="请输入编码！"
              />
          ),
          },
      ]}
      />
        <ProFormText
        name="name"
        label={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.name',
            defaultMessage: '名称',
        })}
        width="md"
        rules={[
            {
            // required: true,
            message: (
                <FormattedMessage
                id="pages.searchsupplier.updateForm.name"
                defaultMessage="请输入名称！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="bankAccount"
        label={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.bankAccount',
            defaultMessage: '银行账户',
        })}
        width="md"
        rules={[
            {
            // required: true,
            message: (
                <FormattedMessage
                id="pages.searchsupplier.updateForm.bankAccount"
                defaultMessage="请输入银行账户！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="partnershipCase"
        label={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.partnershipCase',
            defaultMessage: '合作案例',
        })}
        width="md"
        rules={[
            {
            // required: true,
            message: (
                <FormattedMessage
                id="pages.searchsupplier.updateForm.partnershipCase"
                defaultMessage="请输入合作案例"
                />
            ),
            },
        ]}
        />
        <ProFormText
            name="attribute"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.attribute',
              defaultMessage: '属性',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.attribute"
                    defaultMessage="请输入属性！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="mode"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.mode',
              defaultMessage: '合作模式',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.mode"
                    defaultMessage="请输入合作模式！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="hotel"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.hotel',
              defaultMessage: '销售范围（酒店）',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.hotel"
                    defaultMessage="请输入销售范围（酒店）！"
                  />
                ),
              },
            ]}
          />
          <ProFormSelect
            name="status"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.status',
              defaultMessage: '合作状态',
            })}
            width="md"
            valueEnum={{
              '确认合作': '确认合作',
              '暂停合作': '暂停合作',
              '终止合作': '终止合作',
            }}
          />
          <ProFormText
            name="contact"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.contact',
              defaultMessage: '联系人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.contact"
                    defaultMessage="请输入联系人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="position"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.position',
              defaultMessage: '职位',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.position"
                    defaultMessage="请输入职位！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="telephone"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.telephone',
              defaultMessage: '电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.telephone"
                    defaultMessage="请输入电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="salesman"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.salesman',
              defaultMessage: '对接人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.salesman"
                    defaultMessage="请输入对接人！"
                  />
                ),
              },
            ]}
          />
          <ProFormSelect
            name="contractStatus"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.contractStatus',
              defaultMessage: '合同状态',
            })}
            width="md"
            valueEnum={{
              '确认': '确认',
              '暂停': '暂停',
              '终止': '终止',
            }}
          />
          <ProFormDatePicker
            name="dealDate"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.dealDate',
              defaultMessage: '签订日期',
            })}
            // rules={[
            //   {
            //     message: (
            //       <FormattedMessage
            //         id="pages.searchsupplier.updateForm.dealDate"
            //         defaultMessage="请选择签订日期！"
            //       />
            //     ),
            //   },
            // ]}
          />
          <ProFormDatePicker
            name="startDate"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.startDate',
              defaultMessage: '生效日期',
            })}
            // rules={[
            //   {
            //     message: (
            //       <FormattedMessage
            //         id="pages.searchsupplier.updateForm.startDate"
            //         defaultMessage="请选择生效日期！"
            //       />
            //     ),
            //   },
            // ]}
          />
          <ProFormDatePicker
            name="endDate"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.endDate',
              defaultMessage: '终止日期',
            })}
            // rules={[
            //   {
            //     message: (
            //       <FormattedMessage
            //         id="pages.searchsupplier.updateForm.endDate"
            //         defaultMessage="请选择终止日期！"
            //       />
            //     ),
            //   },
            // ]}
          />
          <ProFormTextArea
            name="remark"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.remark',
              defaultMessage: '备注',
            })}
            // placeholder={intl.formatMessage({
            //   id: 'pages.searchsupplier.updateForm.remark',
            //   defaultMessage: '请输入备注！',
            // })}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchsupplier.updateForm.remark"
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
          <ProDescriptions<API.SuppliersListItem>
            column={2}
            title={currentRow?.name}
            request={async () => ({
              data: currentRow || {},
            })}
            params={{
              id: currentRow?.name,
            }}
            columns={columns as ProDescriptionsItemProps<API.SuppliersListItem>[]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Supplier;
