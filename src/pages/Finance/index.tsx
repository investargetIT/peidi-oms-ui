import React, { useState, useEffect } from 'react';
import { CloudSyncOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps, TabsProps } from 'antd';
import { Button, message, Upload, Progress, Card, Row, Col, Typography, Tabs } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import axios from 'axios';
import Reprocess from './reprocess';
import ReprocessForShop from './reprocessForShop';

const { Dragger } = Upload;
const { Title } = Typography;

const UploadComponent: React.FC<{
  title: string;
  action: string;
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
  percent: number;
  setPercent: (percent: number) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
  onUploadSuccess: () => void; // 新增的属性
}> = ({
  title,
  action,
  fileList,
  setFileList,
  percent,
  setPercent,
  isUploading,
  setIsUploading,
  onUploadSuccess,
}) => {
  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    showUploadList: false,
    maxCount: 1,
    headers: {
      Authorization: localStorage.getItem('token'),
    },
    action,
    onChange(info) {
      const { status, response } = info.file;
      if (status === 'uploading') {
        setIsUploading(true);
        setPercent(50); // 上传过程中设置为 50%
      } else if (status === 'done') {
        if (response.success) {
          setPercent(100); // 上传完成时设置为 100%
          setIsUploading(false);
          message.success(`${info.file.name} 上传成功.`);
          onUploadSuccess(); // 调用成功后更新数据
        } else {
          setIsUploading(false);
          message.error(`${info.file.name} 上传失败  ${response.msg}`);
          setPercent(0); // 上传失败时重置进度
        }
      }

      // 更新文件列表
      const newFileList = info.fileList.map((file) => ({
        ...file,
        url: response?.downloadUrl || '', // 假设接口返回 downloadUrl 字段
      }));
      setFileList(newFileList);
    },
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{title}文件上传</p>
        <p className="ant-upload-hint">单击或拖动文件到此区域进行上传，仅支持xlsx文件</p>
      </Dragger>

      {isUploading && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={percent} />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  // 抖音仅退款
  const [dyFileList, setDYFileList] = useState<UploadFile[]>([]);
  const [dyPercent, setDYPercent] = useState<number>(0);
  const [isDYUploading, setIsDYUploading] = useState<boolean>(false);

  // 阿里发票
  const [aliFileList, setAliFileList] = useState<UploadFile[]>([]);
  const [aliPercent, setAliPercent] = useState<number>(0);
  const [isAliUploading, setIsAliUploading] = useState<boolean>(false);

  // 财务手工调整的发票
  const [manualFileList, setManualFileList] = useState<UploadFile[]>([]);
  const [manualPercent, setManualPercent] = useState<number>(0);
  const [isManualUploading, setIsManualUploading] = useState<boolean>(false);

  // 拼多多仅退款
  const [pddFileList, setPddFileList] = useState<UploadFile[]>([]);
  const [pddPercent, setPddPercent] = useState<number>(0);
  const [isPddUploading, setIsPddUploading] = useState<boolean>(false);

  // 京东仅退款
  const [jdFileList, setJdFileList] = useState<UploadFile[]>([]);
  const [jdPercent, setJdPercent] = useState<number>(0);
  const [isJdUploading, setIsJdUploading] = useState<boolean>(false);

  // 天猫仅退款
  const [tmFileList, setTmFileList] = useState<UploadFile[]>([]);
  const [tmPercent, setTmPercent] = useState<number>(0);
  const [isTmUploading, setIsTmUploading] = useState<boolean>(false);

  // 用于保存接口返回的数据
  const [uploadFileNames, setUploadFileNames] = useState<string[]>([]);
  const [executeFileNames, setExecuteFileNames] = useState<string[]>([]);
  const [executeStatus, setExecuteStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // 获取状态信息
  useEffect(() => {
    const fetchExecuteStatus = async () => {
      try {
        const response = await axios.get(`${process.env.BASE_URL}/finance/date/execute`, {
          headers: { Authorization: localStorage.getItem('token') },
        });
        const { executeFileNames, uploadFileNames, executeStatus, uploadStatus } =
          response.data.data;
        setUploadFileNames(uploadFileNames);
        setExecuteFileNames(executeFileNames);
        setExecuteStatus(executeStatus);
        setUploadStatus(uploadStatus);
        console.log(executeStatus);
      } catch (error) {
        console.error('Failed to fetch execute status:', error);
      }
    };

    fetchExecuteStatus();
  }, []);

  // 上传成功后调用的函数
  const handleUploadSuccess = async () => {
    try {
      const response = await axios.get(`${process.env.BASE_URL}/finance/date/execute`, {
        headers: { Authorization: localStorage.getItem('token') },
      });
      const { uploadFileNames, executeStatus } = response.data.data;
      setUploadFileNames(uploadFileNames);
      setExecuteStatus(executeStatus);
      // message.success('状态信息已更新');
    } catch (error) {
      console.error('Failed to refresh execute status:', error);
      // message.error('更新状态信息失败');
    }
  };

  const execute = async () => {
    try {
      await axios.post(
        `${process.env.BASE_URL}/finance/date/execute`,
        {},
        {
          headers: { Authorization: localStorage.getItem('token') },
        },
      );
      // 成功后可以选择重新获取状态信息
    } catch (error) {
      // console.error('Failed to execute finance processing:', error);
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: '1',
      label: '发票及退款文件上传',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={12}>
              {/* 显示已上传文件和计算状态 */}
              <div style={{ marginBottom: 16 }}>
                <h3>已上传文件:</h3>
                <ul>
                  {uploadFileNames.length > 0 ? (
                    uploadFileNames.map((fileName, index) => (
                      <li key={index}>
                        <a
                          href={`${
                            process.env.BASE_URL
                          }/finance/download?objectName=${fileName}&authorization=${localStorage.getItem(
                            'token',
                          )}`}
                        >
                          {fileName} - 点击下载
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>暂无已上传文件</li>
                  )}
                </ul>
                <Button
                  disabled={uploadStatus == 'false' || executeStatus == 'false'}
                  type="primary"
                  onClick={execute}
                  htmlType="submit"
                  icon={<CloudSyncOutlined />}
                >
                  财务数据处理
                </Button>
                {/* 增加执行文件列表 */}
                <h3 style={{ marginTop: 16 }}>执行文件:</h3>
                <ul>
                  {executeFileNames && executeFileNames.length > 0 ? (
                    executeFileNames.map((fileName, index) => (
                      <li key={index}>
                        <a
                          href={`${
                            process.env.BASE_URL
                          }/finance/download?objectName=${fileName}&authorization=${localStorage.getItem(
                            'token',
                          )}`}
                        >
                          {fileName} - 点击下载
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>暂无执行文件</li>
                  )}
                </ul>
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <UploadComponent
                title="财务手工调整的发票"
                action={`${process.env.BASE_URL}/finance/upload/invoiceManual`}
                fileList={manualFileList}
                setFileList={setManualFileList}
                percent={manualPercent}
                setPercent={setManualPercent}
                isUploading={isManualUploading}
                setIsUploading={setIsManualUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
            <Col span={12}>
              <UploadComponent
                title="阿里发票"
                action={`${process.env.BASE_URL}/finance/upload/invoice`}
                fileList={aliFileList}
                setFileList={setAliFileList}
                percent={aliPercent}
                setPercent={setAliPercent}
                isUploading={isAliUploading}
                setIsUploading={setIsAliUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <UploadComponent
                title="抖音仅退款"
                action={`${process.env.BASE_URL}/finance/upload/douyinRefund`}
                fileList={dyFileList}
                setFileList={setDYFileList}
                percent={dyPercent}
                setPercent={setDYPercent}
                isUploading={isDYUploading}
                setIsUploading={setIsDYUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
            <Col span={12}>
              <UploadComponent
                title="拼多多仅退款"
                action={`${process.env.BASE_URL}/finance/upload/pddrefund`}
                fileList={pddFileList}
                setFileList={setPddFileList}
                percent={pddPercent}
                setPercent={setPddPercent}
                isUploading={isPddUploading}
                setIsUploading={setIsPddUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <UploadComponent
                title="京东仅退款"
                action={`${process.env.BASE_URL}/finance/upload/jdRefund`}
                fileList={jdFileList}
                setFileList={setJdFileList}
                percent={jdPercent}
                setPercent={setJdPercent}
                isUploading={isJdUploading}
                setIsUploading={setIsJdUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
            <Col span={12}>
              <UploadComponent
                title="天猫仅退款"
                action={`${process.env.BASE_URL}/finance/upload/tmallRefund`}
                fileList={tmFileList}
                setFileList={setTmFileList}
                percent={tmPercent}
                setPercent={setTmPercent}
                isUploading={isTmUploading}
                setIsUploading={setIsTmUploading}
                onUploadSuccess={handleUploadSuccess} // 传递上传成功的处理函数
              />
            </Col>
          </Row>
        </Card>
      ),
    },
    {
      key: '2',
      label: '销售单文件上传',
      children: <ReprocessForShop />,
    },
  ];

  return (
    <PageContainer>
      <Tabs defaultActiveKey="1" items={tabItems} size="large" type="card" />
    </PageContainer>
  );
};

export default App;
