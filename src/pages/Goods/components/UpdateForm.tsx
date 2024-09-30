  import { fetchSuppliers,fileUpload,fetchGoodsCategory } from '@/services/ant-design-pro/api';
  import {
    ProFormDateTimePicker,
    ProFormDatePicker,
    DatePicker,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    StepsForm,
    ProForm,
    ProFormItem,
  } from '@ant-design/pro-components';
  import { FormattedMessage, useIntl } from '@umijs/max';
  import { Modal,Input,Upload,Button,message,InputNumber } from 'antd';
  import React, {useEffect, useState, useRef } from 'react';
  import { UploadOutlined } from '@ant-design/icons';

  export type FormValueType = {
    id?: string;
    internalCode?: string;
    externalCode?: string;
    name?: string;
    category?: string;
    picture?: string;
    brand?: string;
    details?: string;
    usageLocation?: string;
    unit?: string;
    boxStandards?: string;
    costPrice?: string;
    sellingPrice?: string;
    grossMargin?: string;
    supplierId?: string;
    goodsCategoryId?: string;
    leadTime?: string;
    moq?: string;
    remark?: string;
  } & Partial<API.GoodsListItem>;
  
  export type UpdateFormProps = {
    onCancel: (flag?: boolean, formVals?: FormValueType) => void;
    onSubmit: (values: FormValueType) => Promise<void>;
    updateModalOpen: boolean;
    values: Partial<API.GoodsListItem>;
  };
  
  const UpdateForm: React.FC<UpdateFormProps> = (props) => {
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [GoodsCategoryOptions, setGoodsCategoryOptions] = useState([]);
    const [filteredGoodsCategoryOptions, setFilteredGoodsCategoryOptions] = useState([]);
    const [searchGoodsCategoryValue, setSearchGoodsCategoryValue] = useState('');
    // 从 props 中提取数据
    const { supplier, leadTime, moq, remark, picture, goodsCategory } = props.values;

    // 提取 supplier 对象中的 id 和 name
    const supplierId = supplier?.id;
    const supplierName = supplier?.name;
    const goodsCategoryId = goodsCategory?.id;
    const goodsCategoryName = goodsCategory?.name;

    useEffect(() => {
      // Fetch suppliers initially
      const loadSuppliers = async () => {
        const { data, success } = await fetchSuppliers({ current: 1, pageSize: 10000 }); // Adjust pageSize as needed
        if (success) {
          const options = data.map(supplier => ({
            label: supplier.name,
            value: supplier.id, // Ensure this is a number
          }));
          setSupplierOptions(options);
          setFilteredOptions(options); // Initialize filtered options
        }
      };
      loadSuppliers();
    }, []);

    useEffect(() => {
      // Fetch suppliers initially
      const loadGoodsCategory = async () => {
        const { data, success } = await fetchGoodsCategory({ current: 1, pageSize: 10000 }); // Fetch enough data
        if (success) {
          // const options = data.map(goodsCategory => ({
          //   label: goodsCategory.name,
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
          const filename = file.name;
            // Call your fileUpload function
          const response = await fileUpload({filename,file});
          if (response && response.data && response.data.fileUrl) {
            onSuccess(response.data.fileUrl, file);
            message.success(`${file.name} file uploaded successfully`);
          } else {
            onError(new Error('Upload failed.'));
            message.error('File upload failed.');
          }
        } catch (error) {
          onError(error);
          message.error('File upload failed.');
        }
      },
      listType: 'picture',
      maxCount: 1,
      showUploadList: {
        showRemoveIcon: false, // Hide remove icon
      },
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
    
    const intl = useIntl();
    return (
      <StepsForm
        stepsProps={{
          size: 'small',
        }}
        // current={currentStep}
        // onChange={(current) => setCurrentStep(current)}
        stepsFormRender={(dom, submitter) => {
          return (
            <Modal
              width={640}
              styles={{
                body: {
                  padding: '32px 40px 48px',
                },
              }}
              destroyOnClose
              title={intl.formatMessage({
                id: 'pages.searchgoods.updateForm.editInfo',
                defaultMessage: '编辑信息',
              })}
              open={props.updateModalOpen}
              footer={submitter}
              onCancel={() => {
                props.onCancel();
                setCurrentStep(0);
              }}
            >
              {dom}
            </Modal>
          );
        }}
        onFinish={props.onSubmit}
      >
        <StepsForm.StepForm
            initialValues={{
              id: props.values.id,
              internalCode: props.values.internalCode,
              externalCode: props.values.externalCode,
              name: props.values.name,
              goodsCategoryId: goodsCategoryId,
              goodsCategoryName: goodsCategoryName,
            }}
            title={intl.formatMessage({
              id: 'pages.searchgoods.updateForm.basicConfig',
              defaultMessage: '基本信息',
            })}
          >
          <ProFormText
            name="id"
            hidden={true}
            label={intl.formatMessage({
              id: 'pages.searchgoods.id',
              defaultMessage: 'ID',
              
            })}
            width="md"
          />
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
            name='goodsCategoryId'
            label={<FormattedMessage id="pages.searchgoods.goodsCategoryId" defaultMessage="goodsCategoryId" />}
            options={GoodsCategoryOptions}
            fieldProps={{
              showSearch: true,
              filterOption: true, // 禁用默认过滤
              onSearch: (value) => setSearchGoodsCategoryValue(value), // 更新搜索值
              // dropdownRender: (menu) => (
              //   <div>
              //     <Input.Search
              //       placeholder="Search goodsCategory"
              //       onSearch={value => setSearchGoodsCategoryValue(value)}
              //       style={{ marginBottom: 8 }}
              //     />
              //     {menu}
              //   </div>
              // ),
            }}
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage id="pages.searchgoods.goodsCategoryId" defaultMessage="Please select a goodsCategory!" />
                ),
              },
            ]}
        />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            picture: props.values.picture ? [{
              status: 'done',
              response: props.values.picture,
              url: props.values.picture,
            }] : [],
            brand: props.values.brand,
            details: props.values.details,
            usageLocation: props.values.usageLocation,
          }}
          title={intl.formatMessage({
            id: 'pages.searchgoods.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProForm.Item
            name="picture"
            label={intl.formatMessage({ id: 'pages.searchgoods.picture', defaultMessage: '图片' })}
            valuePropName="fileList"
            getValueFromEvent={(event) => event.fileList}
            rules={[
              {
                required: true,
                message: <FormattedMessage id="pages.searchgoods.picture" defaultMessage="请选择图片！" />,
              },
            ]}
          >
            <Upload {...uploadProps}>
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
          <ProFormText
            name="usageLocation"
            label={intl.formatMessage({
              id: 'pages.searchgoods.usageLocation',
              defaultMessage: '使用位置）',
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
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            unit: props.values.unit,
            boxStandards: props.values.boxStandards,
            costPrice: props.values.costPrice,
            sellingPrice: props.values.sellingPrice,
            grossMargin: props.values.grossMargin,
          }}
          title={intl.formatMessage({
            id: 'pages.searchgoods.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
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
            fieldProps={{
              // Use InputNumber to handle number input
              addonBefore: intl.formatMessage({
                id: 'pages.searchgoods.costPrice',
                defaultMessage: '¥', // Example currency symbol
              }),
              parser: (value) => value.replace(/^\D+/g, ''), // Remove non-numeric characters
              formatter: (value) => {
                if (!value) return '';
                return `¥ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; // Format as currency
              },
            }}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoods.costPrice"
                    defaultMessage="请输入成本价！"
                  />
                ),
                type: 'number', // Ensure the value is treated as a number
                transform: value => Number(value),
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
            fieldProps={{
              // Use InputNumber to handle number input
              addonBefore: intl.formatMessage({
                id: 'pages.searchgoods.sellingPrice',
                defaultMessage: '¥', // Example currency symbol
              }),
              parser: (value) => value.replace(/^\D+/g, ''), // Remove non-numeric characters
              formatter: (value) => {
                if (!value) return '';
                return `¥ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; // Format as currency
              },
            }}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoods.sellingPrice"
                    defaultMessage="请输入销售价！"
                  />
                ),
                type: 'number', // Ensure the value is treated as a number
                transform: value => Number(value),
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
            fieldProps={{
              // Use InputNumber to handle number input
              addonBefore: intl.formatMessage({
                id: 'pages.searchgoods.grossMargin',
                defaultMessage: '¥', // Example currency symbol
              }),
              parser: (value) => value.replace(/^\D+/g, ''), // Remove non-numeric characters
              formatter: (value) => {
                if (!value) return '';
                return `¥ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; // Format as currency
              },
            }}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoods.grossMargin"
                    defaultMessage="请输入毛利率！"
                  />
                ),
                type: 'number', // Ensure the value is treated as a number
                transform: value => Number(value),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            supplierId: supplierId,
            supplierName: supplierName, // 默认显示的供应商名称（只读）
            leadTime: leadTime,
            moq: moq,
            remark: remark,
          }}
          title={intl.formatMessage({
            id: 'pages.searchgoods.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
        <ProFormSelect
          name='supplierId'
          label={<FormattedMessage id="pages.searchgoods.supplierId" defaultMessage="Supplier" />}
          options={supplierOptions}
          fieldProps={{
            showSearch: true,
            filterOption: true, // 禁用默认过滤
            onSearch: (value) => setSearchValue(value), // 更新搜索值
            // dropdownRender: (menu) => (
            //   <div>
            //     <Input.Search
            //       placeholder="Search supplier"
            //       onSearch={value => setSearchValue(value)}
            //       style={{ marginBottom: 8 }}
            //     />
            //     {menu}
            //   </div>
            // ),
          }}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage id="pages.searchgoods.supplierId" defaultMessage="Please select a supplier!" />
              ),
            },
          ]}
        />
        <ProFormText
          name="leadTime"
          label={intl.formatMessage({
            id: 'pages.searchgoods.leadTime',
            defaultMessage: '供货周期',
          })}
          width="md"
          rules={[
            {
              // required: true,
              message: (
                <FormattedMessage
                  id="pages.searchgoods.leadTime"
                  defaultMessage="请输入供货周期！"
                />
              ),
            },
          ]}
        />
        <ProFormText
          name="moq"
          label={intl.formatMessage({
            id: 'pages.searchgoods.moq',
            defaultMessage: '起订量',
          })}
          width="md"
          // rules={[
          //   {
          //     // required: true,
          //     message: (
          //       <FormattedMessage
          //         id="pages.searchgoods.moq"
          //         defaultMessage="请输入起订量！"
          //       />
          //     ),
          //   },
          // ]}
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
        </StepsForm.StepForm>
      </StepsForm>
    );
  };
  
  export default UpdateForm;
  