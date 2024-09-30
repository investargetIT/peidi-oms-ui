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
    code?: string;
    name?: string;
    bankAccount?: string;
    partnershipCase?: string;
    attribute?: string;
    mode?: string;
    hotel?: string;
    status?: string;
    contact?: string;
    position?: string;
    telephone?: string;
    salesman?: string;
    contractStatus?: string;
    dealDate?: string;
    startDate?: string;
    endDate?: string;
    remark?: string;
  } & Partial<API.SuppliersListItem>;
  
  export type UpdateFormProps = {
    onCancel: (flag?: boolean, formVals?: FormValueType) => void;
    onSubmit: (values: FormValueType) => Promise<void>;
    updateModalOpen: boolean;
    values: Partial<API.SuppliersListItem>;
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
                id: 'pages.searchsupplier.updateForm.editInfo',
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
            code: props.values.code,
            name: props.values.name,
            bankAccount: props.values.bankAccount,
            partnershipCase: props.values.partnershipCase,
          }}
          title={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="id"
            // readonly
            disabled
            hidden={true}
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.id',
              defaultMessage: 'ID',
              
            })}
            width="md"
          />
          <ProFormText
            name="code"
            // readonly
            disabled
            label={intl.formatMessage({
              id: 'pages.searchsupplier.updateForm.code',
              defaultMessage: '编码',
            })}
            width="md"
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
                    defaultMessage="请输入合作案例！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            attribute: props.values.attribute,
            mode: props.values.mode,
            hotel: props.values.hotel,
            status: props.values.status,
          }}
          title={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          
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
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            contact: props.values.contact,
            position: props.values.position,
            telephone: props.values.telephone,
            salesman: props.values.salesman,
            contractStatus: props.values.contractStatus,
          }}
          title={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
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
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            dealDate: props.values.dealDate,
            startDate: props.values.startDate,
            endDate: props.values.endDate,
            remark: props.values.remark,
          }}
          title={intl.formatMessage({
            id: 'pages.searchsupplier.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
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
        </StepsForm.StepForm>
      </StepsForm>
    );
  };
  
  export default UpdateForm;
  