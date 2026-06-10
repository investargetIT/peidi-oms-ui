import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  UploadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Select,
  Table,
  Space,
  message,
  Modal,
  Upload,
  DatePicker,
  Tag,
  Tooltip,
  Form,
} from 'antd';
import type { UploadProps } from 'antd';
import SalesmanBillCheckApi, {
  type SalesmanBillCheckVo,
  type PageParams,
} from '@/services/salesmanBillCheckApi';
import dayjs from 'dayjs';

// 权限判断函数
const hasUploadPermission = () => {
  try {
    const parentByUser = JSON.parse(localStorage.getItem('parentByUser') || '{}');
    const parentDeptIds = parentByUser?.parent_list?.[0]?.parent_dept_id_list || [];

    // 信息部(939900386) 或 财务部(981619927)
    return parentDeptIds.includes(939900386) || parentDeptIds.includes(981619927);
  } catch {
    return false;
  }
};

const SalesmanAccounting: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<SalesmanBillCheckVo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkModalVisible, setCheckModalVisible] = useState(false);
  const [checkingRecord, setCheckingRecord] = useState<SalesmanBillCheckVo | null>(null);
  const [form] = Form.useForm();
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    setCanUpload(hasUploadPermission());
  }, []);

  // 搜索条件
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [searchIsChecked, setSearchIsChecked] = useState<string | undefined>(undefined);

  // 分页查询
  const fetchData = async (params: PageParams = {}) => {
    setLoading(true);
    try {
      const res = await SalesmanBillCheckApi.getPage({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        username: searchUsername || undefined,
        isChecked: searchIsChecked ? Number(searchIsChecked) : undefined,
        ...params,
      });
      if (res.code === 200) {
        let records = res.data.records || [];

        // 判断当前用户是否是信息部或财务部，如果是则显示所有数据，否则业务员只能看到自己的数据
        try {
          const isAdminOrFinance = hasUploadPermission();

          if (!isAdminOrFinance) {
            const currentUser = JSON.parse(localStorage.getItem('user-check') || '{}');
            const currentUserId = currentUser?.id;

            if (currentUserId && records.length > 0) {
              // 检查返回数据中是否有这个userId
              const isSalesman = records.some(
                (item: SalesmanBillCheckVo) => item.userId === currentUserId,
              );
              if (isSalesman) {
                // 只显示当前业务员自己的数据
                records = records.filter(
                  (item: SalesmanBillCheckVo) => item.userId === currentUserId,
                );
              }
            }
          }
        } catch {
          // 忽略解析错误
        }

        setDataSource(records);
        setPagination({
          current: res.data.current || 1,
          pageSize: res.data.size || 10,
          total: res.data.total || 0,
        });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : '获取数据失败');
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchUsername, searchIsChecked]);

  // 上传文件配置
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    fileList: selectedFile ? [{ uid: '1', name: selectedFile.name, status: 'done' }] : [],
    onRemove: () => {
      setSelectedFile(null);
    },
    accept: '.xlsx,.xls,.csv',
  };

  // 提交上传
  const handleUpload = async () => {
    if (!selectedFile) {
      message.error('请选择文件');
      return;
    }
    if (!selectedDate) {
      message.error('请选择日期');
      return;
    }

    // 获取当前用户ID
    let uploadUserId: number | undefined;
    try {
      const currentUser = JSON.parse(localStorage.getItem('user-check') || '{}');
      uploadUserId = currentUser?.id ? currentUser.id : undefined;
    } catch {
      // 忽略解析错误
    }

    if (!uploadUserId) {
      message.error('获取用户信息失败');
      return;
    }

    setUploading(true);
    try {
      const res = await SalesmanBillCheckApi.upload({
        date: selectedDate,
        uploadUserId,
        file: selectedFile,
      });
      if (res.code === 200) {
        message.success('上传成功');
        setUploadModalVisible(false);
        setSelectedFile(null);
        fetchData({ pageNum: 1 });
      } else if (res.code === 500) {
        // message.error(res.data || res.msg || '上传失败');
      } else {
        message.error(res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 核对操作 - 打开弹窗
  const handleCheck = (record: SalesmanBillCheckVo) => {
    if (!record.id) return;
    setCheckingRecord(record);
    form.resetFields();
    setCheckModalVisible(true);
  };

  // 确认核对
  const handleConfirmCheck = async () => {
    if (!checkingRecord) return;
    try {
      const values = await form.validateFields();
      if (values.confirmUsername !== checkingRecord.username) {
        message.error('业务员名称输入不正确，请重新输入');
        return;
      }

      if (!checkingRecord.id) {
        message.error('记录ID不存在');
        return;
      }

      const res = await SalesmanBillCheckApi.check(checkingRecord.id);
      if (res.code === 200) {
        message.success('核对成功');
        setCheckModalVisible(false);
        fetchData();
      } else if (res.code === 500) {
        message.error(res.data || res.msg || '核对失败');
      } else {
        message.error(res.msg || '核对失败');
      }
    } catch (error) {
      console.error('核对失败:', error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '业务员',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '状态',
      dataIndex: 'isChecked',
      key: 'isChecked',
      width: 120,
      render: (isChecked: number) => (
        <Tag color={isChecked === 1 ? 'success' : 'default'}>
          {isChecked === 1 ? '已核对' : '未核对'}
        </Tag>
      ),
    },
    {
      title: '数据日期',
      dataIndex: 'checkedDate',
      key: 'checkedDate',
      width: 120,
      render: (text: string) => {
        if (!text) return '-';
        return dayjs(text).format('YYYY-MM');
      },
    },
    {
      title: '用户核对确认日期',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: SalesmanBillCheckVo) => (
        <Space size="small">
          {record.splitFilePath && (
            <Tooltip title="下载">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                href={`${process.env.BASE_URL}/finance/download?objectName=${
                  record.splitFilePath
                }&authorization=${localStorage.getItem('token')}`}
              />
            </Tooltip>
          )}
          {record.isChecked !== 1 && (
            <Tooltip title="核对">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCheck(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* 操作栏 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索业务员"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            style={{ width: 150 }}
            allowClear
            value={searchIsChecked}
            onChange={(value) => setSearchIsChecked(value)}
            options={[
              { label: '未核对', value: '0' },
              { label: '已核对', value: '1' },
            ]}
          />
        </div>
        {canUpload && (
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传核算数据
          </Button>
        )}
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize: pageSize || 50 }));
            fetchData({ pageNum: page, pageSize });
          },
        }}
      />

      {/* 上传弹窗 */}
      <Modal
        title="上传核算数据"
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => {
          setUploadModalVisible(false);
          setSelectedFile(null);
        }}
        confirmLoading={uploading}
        okText="上传"
        cancelText="取消"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              日期 <span style={{ color: 'red' }}>*</span>
            </div>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={selectedDate ? dayjs(selectedDate) : null}
              onChange={(date) => setSelectedDate(date ? date.format('YYYY-MM') : '')}
              placeholder="请选择月份"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>
              文件 <span style={{ color: 'red' }}>*</span>
            </div>
            <Upload {...uploadProps}>
              <Button icon={<FileTextOutlined />}>选择文件</Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              支持 .xlsx, .xls, .csv 格式文件
            </div>
          </div>
        </div>
      </Modal>

      {/* 核对确认弹窗 */}
      <Modal
        title="确认核对"
        open={checkModalVisible}
        onOk={handleConfirmCheck}
        onCancel={() => setCheckModalVisible(false)}
        okText="确认核对"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <p>请输入业务员名称进行确认：</p>
            <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1890ff' }}>
              {checkingRecord?.username}
            </p>
          </div>
          <Form.Item
            name="confirmUsername"
            rules={[{ required: true, message: '请输入业务员名称' }]}
          >
            <Input placeholder="请输入业务员名称" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SalesmanAccounting;
