import { addGoodsCategory, removeGoodsCategory, goodsCategory, updateGoodsCategory } from '@/services/ant-design-pro/api';
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

const GoodsCategory: React.FC = () => {
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
  const [currentRow, setCurrentRow] = useState<API.GoodsCategoryItem>();
  const [selectedRowsState, setSelectedRows] = useState<API.GoodsCategoryItem[]>([]);

  /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */
  const intl = useIntl();

  const columns: ProColumns<API.GoodsCategoryItem>[] = [
    {
      title: <FormattedMessage id="pages.searchgoodsCategory.parentCategory" defaultMessage="Description" />,
      dataIndex: 'parentCategory',
      valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchgoodsCategory.category" defaultMessage="Description" />,
      dataIndex: 'category',
      valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoodsCategory.subCategory" defaultMessage="Description" />,
        dataIndex: 'subCategory',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoodsCategory.name" defaultMessage="Description" />,
        dataIndex: 'name',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoodsCategory.attributes" defaultMessage="Description" />,
        dataIndex: 'attributes',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoodsCategory.others" defaultMessage="Description" />,
        dataIndex: 'others',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoodsCategory.remark" defaultMessage="Description" />,
        dataIndex: 'remark',
        valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchgoodsCategory.operation" defaultMessage="Operating" />,
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
          <FormattedMessage id="pages.searchgoodsCategory.operation.edit" defaultMessage="Configuration" />
        </a>,
        !showDetail && (
            <a
            className="colortext"
            onClick={() => {
              setCurrentRow(record);
              setShowDetail(true);
            }}
          >
            <FormattedMessage id="pages.searchgoodsCategory.operation.details" defaultMessage="Configuration" />
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
  const handleAdd = async (fields: API.GoodsCategoryItem) => {
    const hide = message.loading('正在添加');
    try {
      await addGoodsCategory({ ...fields });
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
      parentCategory: fields.parentCategory,
      category: fields.category,
      subCategory: fields.subCategory,
      name: fields.name,
      attributes: fields.attributes,
      others: fields.others,
      remark: fields.remark,
    }
    try {
      await updateGoodsCategory(id, values);
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
  const handleRemove = async (selectedRows: API.GoodsCategoryItem[]) => {
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
          await removeGoodsCategory(ids);
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
      <ProTable<API.GoodsCategoryItem, API.PageParams>
        headerTitle={intl.formatMessage({
          id: 'pages.searchgoodsCategory.title',
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
            <PlusOutlined /> <FormattedMessage id="pages.searchgoodsCategory.new" defaultMessage="New" />
          </Button>,
        ]}
        request={goodsCategory}
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
              <FormattedMessage id="pages.searchgoodsCategory.chosen" defaultMessage="Chosen" />{' '}
              <a style={{ fontWeight: 600 }}>{selectedRowsState.length}</a>{' '}
              <FormattedMessage id="pages.searchgoodsCategory.item" defaultMessage="项" />
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
              id="pages.searchgoodsCategory.batchDeletion"
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
          id: 'pages.searchgoodsCategory.createForm.newInfo',
          defaultMessage: '新建信息',
        })}
        width="400px"
        open={createModalOpen}
        onOpenChange={handleModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as API.GoodsCategoryItem);
          if (success) {
            handleModalOpen(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
      <ProFormText
      name="parentCategory"
      label={intl.formatMessage({
          id: 'pages.searchgoodsCategory.parentCategory',
          defaultMessage: '大类',
      })}
      width="md"
      rules={[
          {
          required: true,
          message: (
              <FormattedMessage
              id="pages.searchgoodsCategory.parentCategory"
              defaultMessage="请输入大类！"
              />
          ),
          },
      ]}
      />
        <ProFormText
        name="category"
        label={intl.formatMessage({
            id: 'pages.searchgoodsCategory.category',
            defaultMessage: '中类',
        })}
        width="md"
        rules={[
            {
            required: true,
            message: (
                <FormattedMessage
                id="pages.searchgoodsCategory.category"
                defaultMessage="请输入中类！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="subCategory"
        label={intl.formatMessage({
            id: 'pages.searchgoodsCategory.subCategory',
            defaultMessage: '小类',
        })}
        width="md"
        rules={[
            {
            required: true,
            message: (
                <FormattedMessage
                id="pages.searchgoodsCategory.subCategory"
                defaultMessage="请输入小类！"
                />
            ),
            },
        ]}
        />
        <ProFormText
        name="name"
        label={intl.formatMessage({
            id: 'pages.searchgoodsCategory.name',
            defaultMessage: '名称',
        })}
        width="md"
        rules={[
            {
            required: true,
            message: (
                <FormattedMessage
                id="pages.searchgoodsCategory.name"
                defaultMessage="请输入名称"
                />
            ),
            },
        ]}
        />
        <ProFormText
            name="attributes"
            label={intl.formatMessage({
              id: 'pages.searchgoodsCategory.attributes',
              defaultMessage: '分类属性',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoodsCategory.attributes"
                    defaultMessage="请输入分类属性！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="others"
            label={intl.formatMessage({
              id: 'pages.searchgoodsCategory.others',
              defaultMessage: '其他',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoodsCategory.others"
                    defaultMessage="请输入其他！"
                  />
                ),
              },
            ]}
          />
          <ProFormTextArea
            name="remark"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchgoodsCategory.remark',
              defaultMessage: '备注',
            })}
            // placeholder={intl.formatMessage({
            //   id: 'pages.searchgoodsCategory.remark',
            //   defaultMessage: '请输入备注！',
            // })}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoodsCategory.remark"
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
          <ProDescriptions<API.GoodsCategoryItem>
            column={2}
            title={currentRow?.name}
            request={async () => ({
              data: currentRow || {},
            })}
            params={{
              id: currentRow?.name,
            }}
            columns={columns as ProDescriptionsItemProps<API.GoodsCategoryItem>[]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default GoodsCategory;