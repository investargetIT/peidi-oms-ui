import { DownloadOutlined, HomeOutlined, InboxOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  message,
  Progress,
  Radio,
  Row,
  Tree,
  Upload,
  UploadFile,
  UploadProps,
} from 'antd';
import React, { useEffect, useState } from 'react';
import type { TreeDataNode, TreeProps } from 'antd';
import axios from 'axios';
import { useModel } from 'umi';
import {
  handleFormData,
  handleAntdTableData,
  handleCompressBlobs,
  exportObaDataTemplateExcel,
} from '@/pages/FinanceUtils/utils/excel';
import dayjs from 'dayjs';
import { financeObaPage } from '@/services/ant-design-pro/api';

const { Dragger } = Upload;

const UploadComponent: React.FC<{
  username: string;
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
  username,
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
    multiple: true,
    accept: '.xlsx',
    showUploadList: false,
    // maxCount: 1,
    headers: {
      Authorization: localStorage.getItem('token') || '',
    },
    action,
    data: { org, userName: username },
    beforeUpload: (file) => {
      // 根据文件名是否包含org做一次拦截
      if (!file.name.includes(org)) {
        message.error(`文件名中不包含组织名【${org}】，请重新选择文件`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
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
    <div style={{ marginBottom: 0, height: '100%' }}>
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

const ReprocessForShop = () => {
  // 获取全局初始状态 https://umijs.org/docs/max/data-flow#%E5%85%A8%E5%B1%80%E5%88%9D%E5%A7%8B%E7%8A%B6%E6%80%81
  const { initialState, loading, error, refresh, setInitialState } = useModel('@@initialState');

  // 选择店铺所属的组织
  const [org, setOrg] = useState<string>('智创');

  // 销售单_智创
  const [dyFileList, setDYFileList] = useState<UploadFile[]>([]);
  const [dyPercent, setDYPercent] = useState<number>(0);
  const [isDYUploading, setIsDYUploading] = useState<boolean>(false);

  // 用于保存接口返回的数据
  const [uploadFileNames, setUploadFileNames] = useState<string[]>([]);
  const [executeFileNames, setExecuteFileNames] = useState<string[]>([]);
  const [executeStatus, setExecuteStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // 保存源数据列表整理后的文件列表
  const [processedFileList, setProcessedFileList] = useState<any[]>([]);
  // 树列表中已经选中的文件数据
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  // 导出按钮Loading状态
  const [excelLoading, setExcelLoading] = useState(false);

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
        handleUploadListData(uploadFileNames);
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
      const { executeFileNames, uploadFileNames, executeStatus, uploadStatus } = response.data.data;
      setUploadFileNames(uploadFileNames);
      setExecuteFileNames(executeFileNames);
      setExecuteStatus(executeStatus);
      // message.success('状态信息已更新');
      handleUploadListData(uploadFileNames);
    } catch (error) {
      console.error('Failed to refresh execute status:', error);
      // message.error('更新状态信息失败');
    }
  };

  //#region 列表数据处理逻辑
  const handleUploadListData = (sourceData: Array<any>) => {
    console.log(sourceData);
    // 数据模板
    const dataTemplate = [
      {
        org: '智创',
        fileList: [
          //   {
          //     userName: '沈皓钰',
          //     urllist: [
          //       '沈皓钰&oms/finance/upload/2025-10/销售单_宠珍.xlsx',
          //       '沈皓钰&oms/finance/upload/2025-10/销售单_哈宠.xlsx',
          //     ],
          //   },
        ],
      },
      {
        org: '哈宠',
        fileList: [],
      },
      {
        org: '宠珍',
        fileList: [],
      },
    ];
    // 遍历源数据，将数据填充到模板中
    sourceData.forEach((item: any) => {
      // 先按&切割
      const userName = item.split('&')[0];
      const url = item;
      // url里包含dataTemplate里的哪个org，就将数据填充到那个org的fileList中
      const targetOrg: any = dataTemplate.find((item) => url.includes(item.org));
      if (targetOrg) {
        // 如果目标组织的fileList中不存在该用户，就添加该用户
        if (!targetOrg.fileList.find((item2: any) => item2.userName === userName)) {
          targetOrg.fileList.push({
            userName,
            urllist: [url],
          });
        } else {
          // 如果目标组织的fileList中已存在该用户，就将该url添加到该用户的urllist中
          targetOrg.fileList.find((item2: any) => item2.userName === userName)?.urllist.push(url);
        }
      }
    });
    console.log('dataTemplate', dataTemplate);
    // 处理后的文件列表
    setProcessedFileList(dataTemplate);
  };

  // 判断文件是否已经导出的函数
  const isFileExported = (url: string) => {
    return executeFileNames.includes(url);
  };
  //#endregion

  //#region 树组件逻辑
  // treeData变成响应式数据
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);

  useEffect(() => {
    // 先根据org筛选出目标组织的文件列表
    const targetOrg: any = processedFileList.find((item) => item.org === org);
    if (targetOrg) {
      // 然后根据userName和url生成树
      const treeDataTemp: TreeDataNode[] = targetOrg.fileList.map((item: any) => ({
        title: item.userName,
        key: item.userName,
        children: item.urllist.map((url: string) => ({
          title: (
            <>
              {/* 按/切割到最后一个/ 后的字符串 */}
              <span style={{ color: isFileExported(url) ? '#999' : '#1890FF' }}>
                {url.split('/').pop()}
              </span>
              {/* a标签的点击事件不要冒泡 */}
              <a
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 12, marginLeft: 5 }}
                href={`${process.env.BASE_URL}/finance/download?objectName=${
                  url.split('&')[1]
                }&authorization=${localStorage.getItem('token')}`}
              >
                下载
              </a>
            </>
          ),
          key: url,
        })),
      }));
      setTreeData(treeDataTemp);
    }
    // 初始化树样式
  }, [processedFileList, org]);

  // 当org变化时，清空选中的文件
  useEffect(() => {
    setSelectedFiles([]);
  }, [org]);

  const onSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    console.log('selected', selectedKeys, info);
  };

  const onCheck: TreeProps['onCheck'] = (checkedKeys: any, info) => {
    // 过滤掉userName 留下含有oms的
    const filteredKeys = checkedKeys.filter((key: any) => key.includes('oms'));
    setSelectedFiles(filteredKeys);
    console.log('onCheck', filteredKeys, checkedKeys, info);
  };
  //#endregion

  //#region 导出文件逻辑
  const fetchListPage = async () => {
    try {
      setExcelLoading(true);
      // month 当前年-当前月
      const res = await financeObaPage({
        month: dayjs().format('YYYY-MM'),
        pageNo: 1,
        pageSize: 1000,
        // 用,拼接
        path: encodeURIComponent(selectedFiles.join(',')),
      });
      console.log('分页获取oba模板数据', res);
      if (res.code === 200) {
        // 接口请求成功了，先更新视图
        handleUploadSuccess();
        //#region 处理数据
        /** ######################################################################## */
        if (res.data?.records) {
          try {
            // await handleFormData(res.data?.records);
            // await handleAntdTableData(res.data?.records);

            // 把res.data.records 根据org 分组成{org1:[{},{},{}],org2:[{},{},{}]}结构
            const orgMap = res.data.records.reduce((acc: any, cur: any) => {
              if (!acc[cur.org]) {
                acc[cur.org] = [];
              }
              acc[cur.org].push(cur);
              return acc;
            }, {});
            console.log('orgMap', orgMap);

            // 对于orgMap里的每个org 对其进行排序 排序规则是优先sort_row从大到小 其次是line_number从小到大
            // for (const org of Object.keys(orgMap)) {
            //   orgMap[org].sort((a: any, b: any) => {
            //     if (b.sortRow !== a.sortRow) {
            //       return b.sortRow - a.sortRow;
            //     }
            //     return a.lineNumber - b.lineNumber;
            //   });
            // }

            // console.log('orgMap-排序后', orgMap);

            // 用来存需要压缩的文件的blob, 默认放一个模板Excel文件进去
            const blobLists = [];
            //放一份模板文件在最前面
            blobLists.push(await exportObaDataTemplateExcel(org));

            // 遍历orgMap 每个org 调用handleAntdTableData 不用forEach 因为forEach 不支持async await
            for (const org of Object.keys(orgMap)) {
              const blobData = await handleAntdTableData(
                orgMap[org],
                `${org}-${dayjs().format('YYYY-MM')}`,
              );
              // 调用exportObaDataTemplateExcel 导出OBA数据模板Excel文件
              //   blobLists.push(await exportObaDataTemplateExcel(org));
              blobLists.push(blobData);
            }

            // Object.keys(orgMap).forEach(async (org) => {
            //   const blobData = await handleAntdTableData(orgMap[org], `${org}`);
            //   blobLists.push(blobData);
            // });

            console.log('blobLists', blobLists);

            // 压缩blobLists 并导出
            await handleCompressBlobs(blobLists, `OBA数据-${dayjs().format('YYYY-MM')}`);
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
  //#endregion

  return (
    <>
      {/* 选择组织 */}
      <Row>
        <Col span={12}>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>
            选择店铺所属的组织
          </div>
          <Radio.Group
            block
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            size="large"
            buttonStyle="solid"
          >
            <Radio.Button value="智创">智创</Radio.Button>
            <Radio.Button value="哈宠">哈宠</Radio.Button>
            <Radio.Button value="宠珍">宠珍</Radio.Button>
          </Radio.Group>
        </Col>
      </Row>
      {/* 内容展示 */}
      <Card style={{ marginTop: 30 }}>
        <Row>
          {/* 列表 */}
          <Col span={16} style={{ backgroundColor: 'transparent' }}>
            {/* 操作栏 */}
            <Flex
              style={{ marginBottom: 20, paddingRight: 20 }}
              justify="space-between"
              align="center"
            >
              <div style={{ fontSize: 18 }}>
                {`已上传文件 -${org}`}
                <span style={{ fontSize: 14 }}>（文件名蓝色代表未导出，灰色代表已导出）</span>
              </div>
              <Button
                disabled={selectedFiles.length === 0}
                type="primary"
                htmlType="submit"
                icon={<DownloadOutlined />}
                onClick={fetchListPage}
                loading={excelLoading}
              >
                处理后文件导出
              </Button>
            </Flex>

            {/* ##################################################################### */}
            {/* treeData没有数据则显示文字 */}
            {treeData.length === 0 ? (
              <div style={{ fontSize: 14 }}>暂无已上传文件</div>
            ) : (
              <Tree
                selectable={false}
                key={org}
                checkable
                onSelect={onSelect}
                onCheck={onCheck}
                treeData={treeData}
              />
            )}
            {/* ##################################################################### */}
          </Col>
          {/* 上传文件 */}
          <Col span={8} style={{ padding: '0 20px 20px 20px', backgroundColor: 'transparent' }}>
            <UploadComponent
              username={initialState?.currentUser?.name || ''}
              org={org}
              title={`销售单_${org}`}
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
        </Row>
      </Card>
    </>
  );
};

export default ReprocessForShop;
