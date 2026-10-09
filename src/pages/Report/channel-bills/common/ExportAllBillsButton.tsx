import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
} from '@/services/managementReportApi';

export interface ExportAllBillsButtonProps {
  /** 平台名（与各 TAB 查询一致）：支付宝 / 拼多多 / 抖音 / 天猫 / 小红书 / 京东 / 快手 / 微信 / 微盟 */
  platform: string;
  /** 渠道名（微信/微盟 platform 同为「微信」需显式传 channel 区分；其余渠道缺省即可） */
  channel?: string;
  /** 当前查询条件：取其中的 billDate（yyyy-MM）作为下载条件 */
  query: () => Partial<FinanceZfbBillInfoPageReq>;
  /** zip 名称 / 文案前缀，如 拼多多 */
  fileNamePrefix?: string;
}

/**
 * 各渠道月账单 - 「导出所有账单文件」按钮
 *
 * 点击后直接调用后端接口 POST /oms/finance/bill/download，
 * 入参 { billDate: yyyy-MM, platform }，由服务端按账单日期 + 平台到 OSS 拉取
 * 全部账单文件并打包成单个 zip 流式返回，前端一次 saveAs 下载。
 * 服务端到服务端无 CORS 限制，前端零跨域、零多文件拦截。
 */
const ExportAllBillsButton: React.FC<ExportAllBillsButtonProps> = ({
  platform,
  channel,
  query,
  fileNamePrefix = platform,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    const billDate = query()?.billDate;
    if (!billDate) {
      message.warning('请先选择账单日期（月份）');
      return;
    }
    setLoading(true);
    message.loading({ content: `正在打包 ${fileNamePrefix} 账单，请稍候...`, key: 'export-bills', duration: 0 });
    try {
      const payload: any = await ManagementReportApi.downloadBills({
        billDate,
        platform,
        channel,
      });
      message.destroy('export-bills');
      // 后端异常时可能返回 JSON 对象，需识别后提示
      if (!(payload instanceof Blob)) {
        message.error(payload?.msg || '导出失败');
        return;
      }
      const blob: Blob = payload;
      // 后端异常时也可能把 JSON 错误包成 blob，识别后提示
      if (blob.type && blob.type.includes('application/json')) {
        try {
          const json = JSON.parse(await blob.text());
          if (json && json.code && json.code !== 200) {
            message.error(json.msg || '导出失败');
            return;
          }
        } catch {
          // 解析失败则按正常文件下载
        }
      }
      const zipName = `${fileNamePrefix}账单文件_${billDate}_${dayjs().format('YYYYMMDD_HHmmss')}.zip`;
      saveAs(blob, zipName);
      message.success('导出成功');
    } catch (error) {
      console.error('导出账单失败:', error);
      message.destroy('export-bills');
      message.error('导出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      className="excel-export-btn"
      icon={<DownloadOutlined />}
      onClick={handleExport}
      loading={loading}
    >
      导出所有账单文件
    </Button>
  );
};

export default ExportAllBillsButton;
