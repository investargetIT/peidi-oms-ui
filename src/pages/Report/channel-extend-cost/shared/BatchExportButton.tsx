import React, { useState } from 'react';
import { Button, Modal, Progress, Space, Typography, message } from 'antd';
import { DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import ChannelExtendCostApi, { type ShopVo } from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';

const { Text } = Typography;

export interface BatchExportButtonProps {
  /** 渠道名，如「拼多多」「抖音」，用于按钮 / 弹窗标题 / zip 文件名 */
  channel: string;
  /** 当前选中的年月（来自搜索栏），格式 yyyy-MM */
  yearMonth: string;
  /**
   * 获取参与导出的店铺/记录列表。
   * 一般渠道传 fetchChannelShops(channel)；
   * 支付宝这类需要 financeBillConfigId 的渠道可自行调 getGroupPage 拿记录列表。
   */
  fetchShops: () => Promise<any[]>;
  /**
   * 为单个店铺/记录生成 Excel Blob。
   * 抛错即视为该店失败，错误信息写入 zip 内的 _失败明细.txt。
   */
  renderShopExcel: (item: any, shopName: string) => Promise<Blob>;
  /**
   * 可选：为失败的店铺生成空模板 Excel，避免下载包里缺这家店。
   * 不传则失败的店铺不出现在 zip 里，只记录到 _失败明细.txt。
   */
  renderEmptyExcel?: (item: any, shopName: string) => Promise<Blob>;
  /**
   * 导出文件名中的后缀，默认「统计费用」。
   * 最终文件名 = `${店名}_${yearMonth}_${fileSuffix}.xlsx`
   */
  fileSuffix?: string;
  /**
   * 弹窗内的说明文案；不传则使用通用文案。
   */
  descriptionLines?: string[];
}

/**
 * 渠道推广费用 - 通用「导出当前选中月份的所有店铺统计费用」按钮
 *
 * 从拼多多 / 京东两份各自的批量导出按钮里抽取的通用壳：
 * 点击按钮 -> fetchShops 拉取全部店铺 -> pMap 限并发逐店调 renderShopExcel
 * 生成 Excel -> 全部打包成 zip 下载。
 *
 * 失败处理：失败的店铺写入 zip 内的 _失败明细.txt（店名 + 失败原因）。
 */
const BatchExportButton: React.FC<BatchExportButtonProps> = ({
  channel,
  yearMonth,
  fetchShops,
  renderShopExcel,
  renderEmptyExcel,
  fileSuffix = '统计费用',
  descriptionLines,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [shops, setShops] = useState<any[]>([]);
  const [fetchingShops, setFetchingShops] = useState(false);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [exportSummary, setExportSummary] = useState<{
    success: number;
    failed: number;
    zipName: string;
  } | null>(null);

  const openModal = async () => {
    setExportSummary(null);
    setFailures([]);
    setProgress({ current: 0, total: 0 });
    setShops([]);
    setModalOpen(true);
    setFetchingShops(true);
    try {
      const list = await fetchShops();
      setShops(list);
    } catch (e) {
      console.error('获取店铺列表失败:', e);
      message.error('获取店铺列表失败');
      setShops([]);
    } finally {
      setFetchingShops(false);
    }
  };

  const closeModal = () => {
    if (exporting) return;
    setModalOpen(false);
  };

  // 文件名去除 Windows 不允许的字符
  const safeName = (raw: string) => raw.replace(/[/:*?"<>|]/g, '_');

  /**
   * 限并发的 map 实现（concurrency 个 worker 抢一个共享队列）
   */
  async function pMap<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    let idx = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        results[i] = await fn(items[i]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  const doExport = async () => {
    if (shops.length === 0) {
      message.warning('当前渠道下没有可导出的店铺');
      return;
    }
    setExporting(true);
    setProgress({ current: 0, total: shops.length });
    setFailures([]);
    setExportSummary(null);

    const zip = new JSZip();
    const localFailures: { name: string; reason: string }[] = [];
    let successCount = 0;

    await pMap(shops, 5, async (shop) => {
      const shopName = displayShopName(shop.wdtName || shop.shopName) || '';
      const fileBase = safeName(`${shopName}_${yearMonth}_${channel}${fileSuffix}`);
      try {
        const blob = await renderShopExcel(shop, shopName);
        zip.file(`${fileBase}.xlsx`, blob);
        successCount++;
      } catch (e: any) {
        console.error(`店铺 ${shopName} 导出失败:`, e);
        localFailures.push({ name: shopName, reason: e?.message || '未知错误' });
        // 生成空模板，避免下载包里缺这家店
        if (renderEmptyExcel) {
          try {
            const blob = await renderEmptyExcel(shop, shopName);
            zip.file(`${fileBase}.xlsx`, blob);
          } catch (e2: any) {
            console.error(`店铺 ${shopName} 空模板生成也失败:`, e2);
          }
        }
      } finally {
        setProgress((p) => ({ ...p, current: p.current + 1 }));
      }
    });

    // 写入失败日志
    if (localFailures.length > 0) {
      const lines = ['店铺名\t失败原因', ...localFailures.map((f) => `${f.name}\t${f.reason}`)];
      zip.file('_失败明细.txt', lines.join('\n'));
    }

    if (successCount === 0 && localFailures.length === shops.length) {
      message.error('所有店铺导出失败，请检查后端接口');
      setFailures(localFailures);
      setExporting(false);
      return;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = `${channel}全部统计费用_${yearMonth}_${dayjs().format('YYYYMMDD_HHmmss')}.zip`;
    saveAs(zipBlob, zipName);

    setFailures(localFailures);
    setExportSummary({ success: successCount, failed: localFailures.length, zipName });
    message.success(
      `已导出 ${successCount} 家店铺${
        localFailures.length > 0 ? `，${localFailures.length} 家失败` : ''
      }`,
    );
    setExporting(false);
  };

  return (
    <>
      <style>{`
        .grayblue-btn.ant-btn-primary[disabled],
        .grayblue-btn.ant-btn-primary[disabled]:hover,
        .grayblue-btn.ant-btn-primary[disabled]:focus,
        .grayblue-btn.ant-btn-primary[disabled]:active {
          background: #d9d9d9 !important;
          border-color: #d9d9d9 !important;
          color: #ffffff !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
        }
      `}</style>
      <Button
        type="primary"
        className="grayblue-btn"
        style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
        icon={<DownloadOutlined />}
        onClick={openModal}
      >
        导出当前选中月份的所有店铺统计费用
      </Button>
      <Modal
        title={`导出 ${channel} ${yearMonth} 全部店铺统计费用`}
        open={modalOpen}
        onCancel={closeModal}
        onOk={doExport}
        confirmLoading={exporting}
        okText={exporting ? '导出中...' : '开始导出'}
        cancelText="取消"
        width={560}
        destroyOnClose
        okButtonProps={{
          className: 'grayblue-btn',
          style: { background: '#2f54eb', borderColor: '#2f54eb' },
          disabled: shops.length === 0 || exporting,
        }}
      >
        {!exporting && !exportSummary && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              将导出 <Text strong>{shops.length}</Text> 家 {channel} 店铺在{' '}
              <Text strong>{yearMonth}</Text> 的统计费用 Excel。
            </div>
            {fetchingShops ? (
              <div style={{ color: '#999' }}>正在加载店铺列表...</div>
            ) : shops.length === 0 ? (
              <div style={{ color: '#ff4d4f' }}>
                <ExclamationCircleOutlined /> 未找到 {channel} 店铺，请确认店铺配置。
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: 12, lineHeight: 1.7 }}>
                {(
                  descriptionLines || [
                    '· 每店一个 Excel，样式尽量还原前端弹窗（加粗、底纹、校验列染色）',
                    '· 失败的店铺会写入 zip 内的 _失败明细.txt',
                  ]
                ).map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            )}
          </Space>
        )}
        {exporting && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Progress
              percent={Math.round((progress.current / Math.max(progress.total, 1)) * 100)}
              status="active"
            />
            <div style={{ textAlign: 'center', color: '#666' }}>
              正在导出 {progress.current} / {progress.total} 家店铺...
            </div>
          </Space>
        )}
        {!exporting && exportSummary && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              已生成压缩包：<Text strong>{exportSummary.zipName}</Text>
            </div>
            <div>
              <Text type="success">成功 {exportSummary.success} 家</Text>
              {exportSummary.failed > 0 && (
                <Text type="danger" style={{ marginLeft: 12 }}>
                  失败 {exportSummary.failed} 家
                </Text>
              )}
            </div>
            {failures.length > 0 && (
              <div
                style={{
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 4,
                  padding: 8,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {failures.map((f, i) => (
                  <div key={i}>
                    · {f.name}：{f.reason}
                  </div>
                ))}
              </div>
            )}
          </Space>
        )}
      </Modal>
    </>
  );
};

/**
 * 按渠道拉取全部店铺（getShops + platform 精确过滤）
 * 供拼多多 / 天猫 / 抖音 / 小红书等批量导出按钮复用
 */
export async function fetchChannelShops(channel: string): Promise<ShopVo[]> {
  const params = {
    sortStr: '',
    searchStr: JSON.stringify({
      searchName: 'platform',
      searchValue: channel,
      searchType: 'like',
    }),
  };
  const res = await ChannelExtendCostApi.getShops(params);
  if (res.code !== 200) {
    throw new Error('获取店铺列表失败');
  }
  return (res.data || []).filter(
    (s) => s.platform === channel && s.id !== undefined && s.id !== null,
  );
}

export default BatchExportButton;
