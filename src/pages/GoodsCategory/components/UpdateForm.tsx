import {
    ProFormDateTimePicker,
    ProFormDatePicker,
    DatePicker,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    StepsForm,
  } from '@ant-design/pro-components';
  import { FormattedMessage, useIntl } from '@umijs/max';
  import { Modal } from 'antd';
  import React from 'react';
  
  export type FormValueType = {
    id?: string;
    parentCategory?: string;
    category?: string;
    subCategory?: string;
    name?: string;
    attributes?: string;
    others?: string;
    remark?: string;
  } & Partial<API.GoodsCategoryItem>;
  
  export type UpdateFormProps = {
    onCancel: (flag?: boolean, formVals?: FormValueType) => void;
    onSubmit: (values: FormValueType) => Promise<void>;
    updateModalOpen: boolean;
    values: Partial<API.GoodsCategoryItem>;
  };
  
  const UpdateForm: React.FC<UpdateFormProps> = (props) => {
    const intl = useIntl();
    return (
      <StepsForm
        stepsProps={{
          size: 'small',
        }}
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
                id: 'pages.searchgoodsCategory.updateForm.editInfo',
                defaultMessage: '编辑信息',
              })}
              open={props.updateModalOpen}
              footer={submitter}
              onCancel={() => {
                props.onCancel();
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
            parentCategory: props.values.parentCategory,
            category: props.values.category,
            subCategory: props.values.subCategory,
            name: props.values.name,
          }}
          title={intl.formatMessage({
            id: 'pages.searchgoodsCategory.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="id"
            // readonly
            disabled
            hidden={true}
            label={intl.formatMessage({
              id: 'pages.searchgoodsCategory.updateForm.id',
              defaultMessage: 'ID',
              
            })}
            width="md"
          />
          <ProFormText
            name="parentCategory"
            label={intl.formatMessage({
              id: 'pages.searchgoodsCategory.parentCategory',
              defaultMessage: '大类',
            })}
            width="md"
            rules={[
              {
                // required: true,
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
                // required: true,
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
                // required: true,
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
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchgoodsCategory.name"
                    defaultMessage="请输入名称！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            attributes: props.values.attributes,
            others: props.values.others,
            remark: props.values.remark,
          }}
          title={intl.formatMessage({
            id: 'pages.searchgoodsCategory.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
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
            //   id: 'pages.searchsupplier.updateForm.remark',
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
        </StepsForm.StepForm>
      </StepsForm>
    );
  };
  
  export default UpdateForm;
  