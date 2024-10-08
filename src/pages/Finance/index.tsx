import React, { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { message, Upload, Progress, Card, Row, Col, Typography } from 'antd';
import { PageContainer } from '@ant-design/pro-components';

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
}> = ({ title, action, fileList, setFileList, percent, setPercent, isUploading, setIsUploading }) => {
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
      }
      if (status === 'done') {
        setPercent(100); // 上传完成时设置为 100%
        message.success(`${info.file.name} 上传成功.`);
        setIsUploading(false);
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败.`);
        setIsUploading(false);
        setPercent(0); // 上传失败时重置进度
      }

      // 更新文件列表
      const newFileList = info.fileList.map((file) => ({
        ...file,
        url: response?.downloadUrl || '', // 假设接口返回 downloadUrl 字段
      }));
      setFileList(newFileList);
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
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

      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>上传文件：</h3>
          <ul>
            {fileList.map((file) => (
              <li key={file.uid}>
                <a href={file.url} download={file.name}>
                  {file.name} - 点击下载
                </a>
              </li>
            ))}
          </ul>
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

  return (
    <PageContainer>
      <Card>
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
            />
          </Col>
          <Col span={12}>
            <UploadComponent
              title="天猫仅退款"
              action={`${process.env.BASE_URL}/finance/upload/tmallrefund`}
              fileList={tmFileList}
              setFileList={setTmFileList}
              percent={tmPercent}
              setPercent={setTmPercent}
              isUploading={isTmUploading}
              setIsUploading={setIsTmUploading}
            />
          </Col>
        </Row>
      </Card>
    </PageContainer>
  );
};

export default App;
