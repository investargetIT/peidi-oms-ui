import { addGoods, removeGoods, goods, updateGoods, fetchSuppliers, fileUpload, fetchGoodsCategory } from '@/services/ant-design-pro/api';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
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
  ProForm,
} from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Input, message, Modal, Upload } from 'antd';
import React, {useEffect, useRef, useState } from 'react';
import type { FormValueType } from './components/UpdateForm.tsx';
import UpdateForm from './components/UpdateForm.tsx';

const Goods: React.FC = () => {
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [initialValues, setInitialValues] = useState({});
  const [searchValue, setSearchValue] = useState('');
  const [GoodsCategoryOptions, setGoodsCategoryOptions] = useState([]);
  const [filteredGoodsCategoryOptions, setFilteredGoodsCategoryOptions] = useState([]);
  const [searchGoodsCategoryValue, setSearchGoodsCategoryValue] = useState('');

  useEffect(() => {
    // Fetch suppliers initially
    const loadSuppliers = async () => {
      const { data, success } = await fetchSuppliers({ current: 1, pageSize: 10000 }); // Fetch enough data
      if (success) {
        const options = data.map(supplier => ({
          label: supplier.name,
          value: supplier.id,
        }));
        setSupplierOptions(options);
        setFilteredOptions(options); // Initialize filtered options
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    // Fetch GoodsCategory initially
    const loadGoodsCategory = async () => {
      const { data, success } = await fetchGoodsCategory({ current: 1, pageSize: 10000 }); // Fetch enough data
      if (success) {
        // const options = data.map(goodsCategory => ({
        //   label: goodsCategory.parentCategory/goodsCategory.name,
        //   value: goodsCategory.id,
        // }));
        const options = data.map(goodsCategory => ({
          label: `${goodsCategory.parentCategory + '/'}${goodsCategory.category + '/'}${goodsCategory.subCategory + '/'}${goodsCategory.name}`,
          value: goodsCategory.id,
        }));
        setGoodsCategoryOptions(options);
        setFilteredGoodsCategoryOptions(options); // Initialize filtered options
      }
    };
    loadGoodsCategory();
  }, []);

  const uploadProps = {
    customRequest: async ({ file, onSuccess, onError }) => {
        try {
            // Create FormData to send file and additional info if needed
            // const fileNameWithExt = file.name;
            // const fileNameWithoutExt = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) || fileNameWithExt;
            // const filename = fileNameWithoutExt;
            const filename = file.name;
            // Call your fileUpload function
            const response = await fileUpload({filename,file});
            // console.log(response.data.fileUrl)
            if (response.status) {
                onSuccess(response.data.fileUrl, file); // Notify upload success
                message.success(`${file.name} file uploaded successfully`);
            } else {
                onError(new Error('Upload failed.'));
                message.error('File upload failed.');
            }
        } catch (error) {
            onError(error); // Notify upload failure
            message.error('File upload failed.');
        }
    },
    listType: 'picture',
    maxCount: 1,
  };

  useEffect(() => {
    // Filter suppliers based on search value
    const filterOptions = supplierOptions.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredOptions(filterOptions);
  }, [searchValue, supplierOptions]);

  useEffect(() => {
    // Filter suppliers based on search value
    const filterGoodsCategoryOptions = GoodsCategoryOptions.filter(option =>
      option.label.toLowerCase().includes(searchGoodsCategoryValue.toLowerCase())
    );
    setFilteredGoodsCategoryOptions(filterGoodsCategoryOptions);
  }, [searchGoodsCategoryValue, GoodsCategoryOptions]);

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
  const [currentRow, setCurrentRow] = useState<API.GoodsListItem>();
  const [selectedRowsState, setSelectedRows] = useState<API.GoodsListItem[]>([]);

  /**
   * @en-US International configuration
   * @zh-CN 国际化配置
   * */
  const intl = useIntl();

  const columns: ProColumns<API.GoodsListItem>[] = [
    {
      title: <FormattedMessage id="pages.searchgoods.internalCode" defaultMessage="Description" />,
      dataIndex: 'internalCode',
      valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchgoods.externalCode" defaultMessage="Description" />,
      dataIndex: 'externalCode',
      valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.name" defaultMessage="Description" />,
        dataIndex: 'name',
        valueType: 'textarea',
    },
    {
      title: '大类',
      dataIndex: ['goodsCategory', 'parentCategory'],
    },
    {
      title: '中类',
      dataIndex: ['goodsCategory', 'category'],
    },
    {
      title: '小类',
      dataIndex: ['goodsCategory', 'subCategory'],
    },
    {
      title: '品类',
      dataIndex: ['goodsCategory', 'name'],
    },
    {
      title: <FormattedMessage id="pages.searchgoods.details" defaultMessage="Description" />,
      dataIndex: 'details',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.picture" defaultMessage="Description" />,
        dataIndex: 'picture',
        // valueType: 'textarea',
        render: (text) => {
            // Ensure text is a URL, render it as an image
            return text ? <img src={text} alt="Picture" style={{ width: 100, height: 100, objectFit: 'cover' }} /> : 'No Image';
          },
    },
    {
        title: <FormattedMessage id="pages.searchgoods.brand" defaultMessage="Description" />,
        dataIndex: 'brand',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.usageLocation" defaultMessage="Description" />,
        dataIndex: 'usageLocation',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.unit" defaultMessage="Description" />,
        dataIndex: 'unit',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.boxStandards" defaultMessage="Description" />,
        dataIndex: 'boxStandards',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.costPrice" defaultMessage="Description" />,
        dataIndex: 'costPrice',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.sellingPrice" defaultMessage="Description" />,
        dataIndex: 'sellingPrice',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.grossMargin" defaultMessage="Description" />,
        dataIndex: 'grossMargin',
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.supplierId" defaultMessage="Description" />,
        dataIndex: 'supplier',
        render: (supplier) => supplier?.name || 'No name',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.leadTime" defaultMessage="Description" />,
        dataIndex: 'leadTime',
        // sorter: true,
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.moq" defaultMessage="Description" />,
        dataIndex: 'moq',
        // sorter: true,
        valueType: 'textarea',
    },
    {
        title: <FormattedMessage id="pages.searchgoods.remark" defaultMessage="Description" />,
        dataIndex: 'remark',
        valueType: 'textarea',
    },
    {
      title: <FormattedMessage id="pages.searchgoods.operation" defaultMessage="Operating" />,
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
          <FormattedMessage id="pages.searchgoods.operation.edit" defaultMessage="edit" />
        </a>,
        !showDetail && ( // Check if detail view is not open
            <a
              key="details"
              className="colortext"
              onClick={() => {
                setCurrentRow(record);   // Sets the current row to show details
                setShowDetail(true);     // Displays the details view
              }}
            >
              <FormattedMessage id="pages.searchgoods.operation.details" defaultMessage="details" />
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
  const handleAdd = async (fields: API.GoodsListItem) => {
    const hide = message.loading('正在添加');
    // Extract the URL from the picture field
    const picture = fields.picture[0].response; // URL of the uploaded picture
    // Use the URL as needed, e.g., save it to the database or display it
    fields.picture = picture;
    try {
      await addGoods({ ...fields });
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
      internalCode: fields.internalCode,
      externalCode: fields.externalCode,
      name: fields.name,
      // category: fields.category,
      picture: fields.picture[0].response,
      brand: fields.brand,
      details: fields.details,
      usageLocation: fields.usageLocation,
      unit: fields.unit,
      boxStandards: fields.boxStandards,
      costPrice: fields.costPrice,
      sellingPrice: fields.sellingPrice,
      grossMargin: fields.grossMargin,
      supplierId: fields.supplierId,
      goodsCategoryId: fields.goodsCategoryId,
      leadTime: fields.leadTime,
      moq: fields.moq,
      remark: fields.remark,
    }
    try {
      await updateGoods(id, values);
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
  const handleRemove = async (selectedRows: API.GoodsListItem[]) => {
    Modal.confirm({
      title: <FormattedMessage id="pages.searchgoods.deleteConfirmTitle" defaultMessage="确认删除" />,
      content: <FormattedMessage id="pages.searchgoods.deleteConfirmContent" defaultMessage="确定要删除吗？" />,
      okText: <FormattedMessage id="pages.searchgoods.deleteConfirmOk" defaultMessage="确认删除" />,
      cancelText: <FormattedMessage id="pages.searchgoods.deleteConfirmCancel" defaultMessage="取消" />,
      onOk: async () => {
        const hide = message.loading('正在删除');
        if (!selectedRows) return true;
        const ids = selectedRows.map((row) => row.id);
        try {
          await removeGoods(ids);
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
      <ProTable<API.GoodsListItem, API.PageParams>
        headerTitle={intl.formatMessage({
          id: 'pages.searchgoods.title',
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
            <PlusOutlined /> <FormattedMessage id="pages.searchgoods.new" defaultMessage="New" />
          </Button>,
        ]}
        request={goods}
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
              <FormattedMessage id="pages.searchgoods.chosen" defaultMessage="Chosen" />{' '}
              <a style={{ fontWeight: 600 }}>{selectedRowsState.length}</a>{' '}
              <FormattedMessage id="pages.searchgoods.item" defaultMessage="项" />
              {/* &nbsp;&nbsp;
              <span>
                <FormattedMessage
                  id="pages.searchTable.totalServiceCalls"
                  defaultMessage="Total number of service calls"
                />{' '}
                {selectedRowsState.reduce((pre, item) => pre + item.callNo!, 0)}{' '}
                <FormattedMessage id="pages.searchgoods.tenThousand" defaultMessage="万" />
              </span> */}
            </div>
          }
        >
          <Button onClick={() => handleRemove(selectedRowsState)}>
            <FormattedMessage
              id="pages.searchgoods.batchDeletion"
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
            id: 'pages.searchgoods.createForm.newInfo',
            defaultMessage: '新建信息',
            })}
            width="400px"
            open={createModalOpen}
            onOpenChange={handleModalOpen}
            onFinish={async (value) => {
            const success = await handleAdd(value as API.GoodsListItem);
            if (success) {
                handleModalOpen(false);
                if (actionRef.current) {
                actionRef.current.reload();
                }
            }
            }}
        >
            <ProFormText
            name="internalCode"
            label={intl.formatMessage({
                id: 'pages.searchgoods.internalCode',
                defaultMessage: '内部编码',
            })}
            width="md"
            rules={[
                {
                required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.internalCode"
                    defaultMessage="请输入内部编码！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="externalCode"
            label={intl.formatMessage({
                id: 'pages.searchgoods.externalCode',
                defaultMessage: '外部编码',
            })}
            width="md"
            rules={[
                {
                required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.externalCode"
                    defaultMessage="请输入外部编码！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="name"
            label={intl.formatMessage({
                id: 'pages.searchgoods.name',
                defaultMessage: '名称',
            })}
            width="md"
            rules={[
                {
                required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.name"
                    defaultMessage="请输入名称！"
                    />
                ),
                },
            ]}
            />
            <ProFormSelect
              name="goodsCategoryId"
              label={<FormattedMessage id="pages.searchgoods.goodsCategoryId" defaultMessage="goodsCategoryId" />}
              fieldProps={{
              showSearch: true,
              filterOption: false, // Disable default filtering
              onSearch: (value) => setSearchGoodsCategoryValue(value), // Update search value
              options: filteredGoodsCategoryOptions, // Use filtered options
              }}
            />
            <ProFormText
            name="details"
            label={intl.formatMessage({
                id: 'pages.searchgoods.details',
                defaultMessage: '型号/规格/容量/颜色',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.details"
                    defaultMessage="请输入型号/规格/容量/颜色！"
                    />
                ),
                },
            ]}
            />
            <ProForm.Item
                name="picture"
                label={intl.formatMessage({
                    id: 'pages.searchgoods.picture',
                    defaultMessage: '图片',
                })}
                valuePropName="fileList"
                getValueFromEvent={({ fileList }) => fileList}
                rules={[
                    {
                        required: true,
                        message: (
                            <FormattedMessage
                                id="pages.searchgoods.picture"
                                defaultMessage="请选择图片！"
                            />
                        ),
                    },
                ]}
            >
                <Upload {...uploadProps} >
                    <Button icon={<UploadOutlined />}>Upload</Button>
                </Upload>
            </ProForm.Item>
            <ProFormText
            name="brand"
            label={intl.formatMessage({
                id: 'pages.searchgoods.brand',
                defaultMessage: '品牌',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.brand"
                    defaultMessage="请输入品牌！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="usageLocation"
            label={intl.formatMessage({
                id: 'pages.searchgoods.usageLocation',
                defaultMessage: '使用位置',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.usageLocation"
                    defaultMessage="请输入使用位置！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="unit"
            label={intl.formatMessage({
                id: 'pages.searchgoods.unit',
                defaultMessage: '单位',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.unit"
                    defaultMessage="请输入单位！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="boxStandards"
            label={intl.formatMessage({
                id: 'pages.searchgoods.boxStandards',
                defaultMessage: '箱规',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.boxStandards"
                    defaultMessage="请输入箱规！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="costPrice"
            label={intl.formatMessage({
                id: 'pages.searchgoods.costPrice',
                defaultMessage: '成本价',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.costPrice"
                    defaultMessage="请输入成本价！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="sellingPrice"
            label={intl.formatMessage({
                id: 'pages.searchgoods.sellingPrice',
                defaultMessage: '销售价',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.sellingPrice"
                    defaultMessage="请输入销售价！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="grossMargin"
            label={intl.formatMessage({
                id: 'pages.searchgoods.grossMargin',
                defaultMessage: '毛利率',
            })}
            width="md"
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.grossMargin"
                    defaultMessage="请输入毛利率！"
                    />
                ),
                },
            ]}
            />
            <ProFormSelect
            name="supplierId"
            label={<FormattedMessage id="pages.searchgoods.supplierId" defaultMessage="Supplier" />}
            fieldProps={{
            showSearch: true,
            filterOption: false, // Disable default filtering
            onSearch: (value) => setSearchValue(value), // Update search value
            options: filteredOptions, // Use filtered options
            }}
            // rules={[
            //     {
            //         required: true,
            //         message: (
            //         <FormattedMessage id="pages.searchgoods.supplierId" defaultMessage="Please select a supplier!" />
            //         ),
            //     },
            // ]}
            />
            <ProFormText
            name="leadTime"
            width="md"
            label={intl.formatMessage({
                id: 'pages.searchgoods.leadTime',
                defaultMessage: '供货周期',
            })}
            rules={[
                {
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.leadTime"
                    defaultMessage="请选择供货周期！"
                    />
                ),
                },
            ]}
            />
            <ProFormText
            name="moq"
            width="md"
            label={intl.formatMessage({
                id: 'pages.searchgoods.moq',
                defaultMessage: '起订量',
            })}
            rules={[
                {
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.moq"
                    defaultMessage="请选择起订量！"
                    />
                ),
                },
            ]}
            />
            <ProFormTextArea
            name="remark"
            width="md"
            label={intl.formatMessage({
                id: 'pages.searchgoods.remark',
                defaultMessage: '备注',
            })}
            // placeholder={intl.formatMessage({
            //   id: 'pages.searchgoods.remark',
            //   defaultMessage: '请输入备注！',
            // })}
            rules={[
                {
                // required: true,
                message: (
                    <FormattedMessage
                    id="pages.searchgoods.remark"
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
            <ProDescriptions<API.GoodsListItem>
                column={2}
                title={currentRow?.name}
                request={async () => ({
                data: currentRow || {},
                })}
                params={{
                id: currentRow?.name,
                }}
                columns={columns as ProDescriptionsItemProps<API.GoodsListItem>[]}
            />
            )}
        </Drawer>
    </PageContainer>
  );
};

export default Goods;
