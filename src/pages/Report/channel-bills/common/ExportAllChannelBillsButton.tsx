import React, { useState } from 'react';
import { Alert, Button, DatePicker, Modal, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi from '@/services/managementReportApi';

const EXPORT_KEY = 'export-all-channel-bills';

/** 各渠道月账单 9 个 TAB 的下载参数（与各 TAB 内「导出所有账单文件」按钮保持一致） */
interface ChannelBillSource {
  /** 渠道中文名，同时作为 zip 内的目录名 */
  label: string;
  /** 平台名（各 TAB 查询条件里的 platform 一致） */
  platform: string;
  /** 渠道名（微信/微盟 platform 同为「微信」，需显式传 channel 区分） */
  channel?: string;
}

const CHANNEL_BILL_SOURCES: ChannelBillSource[] = [
  { label: '天猫支付宝', platform: '支付宝' },
  { label: '拼多多', platform: '拼多多' },
  { label: '抖音', platform: '抖音' },
  { label: '天猫聚合', platform: '天猫' },
  { label: '小红书', platform: '小红书' },
  { label: '京东', platform: '京东' },
  { label: '快手', platform: '快手' },
  { label: '微信', platform: '微信' },
  { label: '微盟', platform: '微信', channel: '微盟' },
];

/** 后端异常时可能把 JSON 错误包成 blob，识别后返回错误文案 */
const readJsonError = async (blob: Blob): Promise<string | null> => {
  if (!blob.type || !blob.type.includes('json')) return null;
  try {
    const json = JSON.parse(await blob.text());
    if (json && json.code && json.code !== 200) return json.msg || '导出失败';
  } catch {
    // 解析失败按正常文件处理
  }
  return null;
};

/** 限并发的 map（concurrency 个 worker 抢同一个共享队列） */
const pMap = async <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
};

/**
 * 各渠道月账单 - TAB 栏上方的「导出所有渠道月账单」按钮
 *
 * 点击按钮先弹窗选账单月份（默认上月），确认后逐个渠道调用后端
 * GET /oms/finance/bill/download（入参 billDate + platform，与各 TAB 内按钮同一接口），
 * 拿到每个渠道打包好的 zip 后，在前端解压并按「渠道名/文件名」合并进一个总 zip，
 * 最终一次 saveAs 下载「各渠道月账单_yyyy-MM.zip」，一次拿到所有 TAB 的账单文件。
 *
 * 失败渠道不阻断整体导出：写入总包内 _失败明细.txt；
 * 该月无账单文件的渠道写入 _空渠道.txt。
 */
const ExportAllChannelBillsButton: React.FC = () => {
  // 点击按钮后才选月份：弹窗内先选账单日期，确认后才真正开始导出
  const [modalOpen, setModalOpen] = useState(false);
  const [billDate, setBillDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const openModal = () => {
    // 每次打开都回到默认月份，避免沿用上次的月份
    setBillDate(dayjs().subtract(1, 'month'));
    setModalOpen(true);
  };

  const handleExport = async () => {
    if (loading) return;
    if (!billDate) {
      message.warning('请先选择账单日期（月份）');
      return;
    }
    const yearMonth = billDate.format('YYYY-MM');
    setLoading(true);
    setProgress(0);

    const zip = new JSZip();
    const failures: string[] = [];
    const emptyChannels: string[] = [];
    let successCount = 0;
    let doneCount = 0;

    const updateProgress = () => {
      doneCount += 1;
      setProgress(doneCount);
      message.loading({
        content: `正在导出所有渠道月账单（${doneCount}/${CHANNEL_BILL_SOURCES.length}），请稍候...`,
        key: EXPORT_KEY,
        duration: 0,
      });
    };

    message.loading({
      content: `正在导出所有渠道月账单（0/${CHANNEL_BILL_SOURCES.length}），请稍候...`,
      key: EXPORT_KEY,
      duration: 0,
    });

    try {
      await pMap(CHANNEL_BILL_SOURCES, 3, async (item) => {
        try {
          const payload: any = await ManagementReportApi.downloadBills({
            billDate: yearMonth,
            platform: item.platform,
            channel: item.channel,
          });
          if (!(payload instanceof Blob)) {
            failures.push(`${item.label}\t${payload?.msg || '导出失败'}`);
            return;
          }
          const jsonError = await readJsonError(payload);
          if (jsonError) {
            failures.push(`${item.label}\t${jsonError}`);
            return;
          }
          if (payload.size === 0) {
            emptyChannels.push(item.label);
            return;
          }
          // 后端返回的是该渠道的 zip：解压后按「渠道名/文件名」并入总包
          try {
            const inner = await JSZip.loadAsync(payload);
            const files = Object.values(inner.files).filter((f) => !f.dir);
            if (files.length === 0) {
              emptyChannels.push(item.label);
              return;
            }
            await Promise.all(
              files.map(async (f) => {
                zip.file(`${item.label}/${f.name}`, await f.async('blob'));
              }),
            );
            successCount += 1;
          } catch (e) {
            // 不是 zip（例如后端直接返回单文件）：原样放进该渠道目录
            zip.file(`${item.label}/${item.label}账单_${yearMonth}.zip`, payload);
            successCount += 1;
          }
        } catch (error: any) {
          console.error(`导出 ${item.label} 账单失败:`, error);
          failures.push(`${item.label}\t${error?.message || '导出失败'}`);
        } finally {
          updateProgress();
        }
      });

      if (successCount === 0) {
        message.destroy(EXPORT_KEY);
        if (failures.length > 0) {
          message.error(
            `所有渠道导出失败：\n${failures.map((f) => f.replace('\t', '：')).join('；')}`,
          );
        } else {
          message.warning(`${yearMonth} 没有可导出的账单文件`);
        }
        return;
      }

      if (failures.length > 0) {
        zip.file('_失败明细.txt', ['渠道\t失败原因', ...failures].join('\n'));
      }
      if (emptyChannels.length > 0) {
        zip.file('_空渠道.txt', ['以下渠道该月没有账单文件', ...emptyChannels].join('\n'));
      }

      message.loading({ content: '正在打包总压缩包，请稍候...', key: EXPORT_KEY, duration: 0 });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `各渠道月账单_${yearMonth}_${dayjs().format('YYYYMMDD_HHmmss')}.zip`;
      saveAs(zipBlob, zipName);
      message.destroy(EXPORT_KEY);
      message.success(
        `已导出 ${successCount} 个渠道的账单${
          failures.length > 0 ? `，${failures.length} 个渠道失败（见包内 _失败明细.txt）` : ''
        }`,
      );
      setModalOpen(false);
    } catch (error) {
      console.error('导出所有渠道月账单失败:', error);
      message.destroy(EXPORT_KEY);
      message.error('导出失败，请稍后重试');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        type="primary"
        className="excel-export-btn"
        icon={<DownloadOutlined />}
        onClick={openModal}
        loading={loading}
      >
        {loading ? `导出中（${progress}/${CHANNEL_BILL_SOURCES.length}）` : '导出所有渠道月账单'}
      </Button>

      {/* 点击按钮后再选账单日期，确认才真正开始导出 */}
      <Modal
        title="导出所有渠道月账单"
        open={modalOpen}
        onCancel={() => {
          if (!loading) setModalOpen(false);
        }}
        onOk={handleExport}
        okText={loading ? '导出中...' : '开始导出'}
        cancelText="取消"
        width={520}
        destroyOnClose
        maskClosable={!loading}
        closable={!loading}
        confirmLoading={loading}
        okButtonProps={{ disabled: !billDate }}
      >
        <Alert
          type="info"
          showIcon
          message="导出说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 将一次性导出全部 {CHANNEL_BILL_SOURCES.length} 个 TAB（天猫支付宝 / 拼多多 / 抖音 /
              天猫聚合 / 小红书 / 京东 / 快手 / 微信 / 微盟）该月的账单文件
              <br />
              2. 下载为单个 zip，包内按渠道名分目录存放
              <br />
              3. 账单日期格式：yyyy-MM（如 2026-10），一般导出上一月账单
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#666' }}>
            账单日期 <span style={{ color: '#ff4d4f' }}>*</span>
          </span>
          <DatePicker.MonthPicker
            style={{ width: '100%' }}
            value={billDate}
            onChange={(date) => setBillDate(date)}
            format="YYYY-MM"
            placeholder="请选择月份"
            allowClear
            disabled={loading}
          />
        </div>
        {loading && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
            正在导出：{progress}/{CHANNEL_BILL_SOURCES.length} 个渠道，请稍候...
          </div>
        )}
      </Modal>
    </>
  );
};

export default ExportAllChannelBillsButton;
