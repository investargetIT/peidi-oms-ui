import React, { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { message, Upload, Progress } from 'antd';

const { Dragger } = Upload;

const App: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [percent, setPercent] = useState<number>(0); // 公用进度百分比
  const [isUploading, setIsUploading] = useState<boolean>(false); // 上传状态

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false, // 隐藏文件列表
    maxCount: 1,
    headers: {
      Authorization: localStorage.getItem('token'), // 自定义请求头
    },
    action: `${process.env.BASE_URL}/finance/upload/douyinRefund`, // 上传接口
    onChange(info) {
      const { status, response } = info.file;

      if (status === 'uploading') {
        setIsUploading(true);
        setPercent(50); // 上传过程中设置为 50%
      }

      if (status === 'done') {
        setPercent(100); // 上传完成时设置为 100%
        message.success(`${info.file.name} 上传成功.`);
        setIsUploading(false); // 重置上传状态
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败.`);
        setIsUploading(false); // 重置上传状态
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
    <div>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">抖音仅退款EXCEL文件上传</p>
        <p className="ant-upload-hint">单击或拖动文件到此区域进行上传</p>
      </Dragger>

      {/* 只显示一个进度条 */}
      {isUploading && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={percent} />
        </div>
      )}

      {/* 上传文件的下载链接 */}
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

export default App;
