import { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps, TabsProps } from 'antd';
import { Button, message, Upload, Progress, Card, Row, Col, Typography, Tabs } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import axios from 'axios';
import { financeObaPage } from '@/services/ant-design-pro/api';
import dayjs from 'dayjs';
import {
  handleFormData,
  handleAntdTableData,
  handleCompressBlobs,
  exportObaDataTemplateExcel,
} from '@/pages/FinanceUtils/utils/excel';

const { Dragger } = Upload;
const { Title } = Typography;

const UploadComponent: React.FC<{
  org: string;
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
  org,
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
    data: { org },
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

const Reprocess: FC = () => {
  const [excelLoading, setExcelLoading] = useState(false);
  // 销售单_智创
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

  // 销售单_哈宠
  const [pddFileList, setPddFileList] = useState<UploadFile[]>([]);
  const [pddPercent, setPddPercent] = useState<number>(0);
  const [isPddUploading, setIsPddUploading] = useState<boolean>(false);

  // 销售单_旺妙
  const [jdFileList, setJdFileList] = useState<UploadFile[]>([]);
  const [jdPercent, setJdPercent] = useState<number>(0);
  const [isJdUploading, setIsJdUploading] = useState<boolean>(false);

  // 销售单_宠珍
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
        const response = await axios.get(`${process.env.BASE_URL}/finance/oba/upload`, {
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
      const response = await axios.get(`${process.env.BASE_URL}/finance/oba/upload`, {
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
      //   await axios.post(
      //     `${process.env.BASE_URL}/finance/oba/upload`,
      //     {},
      //     {
      //       headers: { Authorization: localStorage.getItem('token') },
      //     },
      //   );
      // 成功后可以选择重新获取状态信息
    } catch (error) {
      // console.error('Failed to execute finance processing:', error);
    }
  };

  const fetchListPage = async () => {
    try {
      setExcelLoading(true);
      // month 当前年-当前月
      const res = await financeObaPage({
        month: `${dayjs().year()}-${dayjs().month() + 1}`,
        pageNo: 1,
        pageSize: 1000,
      });
      console.log('分页获取oba模板数据', res);
      if (res.code === 200) {
        //#region 处理数据
        /** ######################################################################## */
        if (res.data?.records) {
          try {
            // await handleFormData(res.data?.records);
            // await handleAntdTableData(res.data?.records);

            // 把res.data.records 根据org 分组成{org1:[{},{},{}],org2:[{},{},{}]}结构
            const orgMap = res.data.records.reduce((acc, cur) => {
              if (!acc[cur.org]) {
                acc[cur.org] = [];
              }
              acc[cur.org].push(cur);
              return acc;
            }, {});
            console.log('orgMap', orgMap);

            // 对于orgMap里的每个org 对其进行排序 排序规则是优先sort_row从大到小 其次是line_number从小到大
            for (const org of Object.keys(orgMap)) {
              orgMap[org].sort((a, b) => {
                if (b.sortRow !== a.sortRow) {
                  return b.sortRow - a.sortRow;
                }
                return a.lineNumber - b.lineNumber;
              });
            }

            console.log('orgMap-排序后', orgMap);

            // 用来存需要压缩的文件的blob, 默认放一个模板Excel文件进去
            const blobLists = [];

            // 遍历orgMap 每个org 调用handleAntdTableData 不用forEach 因为forEach 不支持async await
            for (const org of Object.keys(orgMap)) {
              const blobData = await handleAntdTableData(
                orgMap[org],
                `${org}-${dayjs().year()}-${dayjs().month() + 1}`,
              );
              // 调用exportObaDataTemplateExcel 导出OBA数据模板Excel文件
              blobLists.push(await exportObaDataTemplateExcel(org));
              blobLists.push(blobData);
            }

            // Object.keys(orgMap).forEach(async (org) => {
            //   const blobData = await handleAntdTableData(orgMap[org], `${org}`);
            //   blobLists.push(blobData);
            // });

            console.log('blobLists', blobLists);

            // 压缩blobLists 并导出
            await handleCompressBlobs(
              blobLists,
              `OBA数据-${dayjs().year()}-${dayjs().month() + 1}`,
            );
            setExcelLoading(false);
          } catch (error) {
            console.log(error);
            message.error('导出失败');
            setExcelLoading(false);
          }
        }
        /** ######################################################################## */
        //#endregion
      }
    } catch (error) {
      console.log(error);
      setExcelLoading(false);
    }
  };

  const handleDebug = async () => {
    try {
      await handleFormData([]);
    } catch (error) {
      console.log(error);
      message.error('处理失败');
    }
  };

  return (
    <div>
      <Card>
        {/* <Button onClick={handleDebug}>财务数据处理</Button> */}
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
                onClick={fetchListPage}
                htmlType="submit"
                loading={excelLoading}
                icon={<DownloadOutlined />}
              >
                处理后文件导出
              </Button>
              {/* 增加执行文件列表 */}
              {/* <h3>执行文件:</h3> */}
              {/* <ul>
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
              </ul> */}
            </div>
          </Col>
        </Row>
        {/* 上传文件 */}
        <Row gutter={16}>
          <Col span={12}>
            <UploadComponent
              org="智创"
              title="销售单_智创"
              action={`${process.env.BASE_URL}/finance/oba/upload`}
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
              org="哈宠"
              title="销售单_哈宠"
              action={`${process.env.BASE_URL}/finance/oba/upload`}
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
              org="旺妙"
              title="销售单_旺妙"
              action={`${process.env.BASE_URL}/finance/oba/upload`}
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
              org="宠珍"
              title="销售单_宠珍"
              action={`${process.env.BASE_URL}/finance/oba/upload`}
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
    </div>
  );
};

export default Reprocess;
