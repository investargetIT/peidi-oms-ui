import React, { useState } from 'react';
import { Button, Modal, Progress, Space, Typography, message } from 'antd';
import { DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import ChannelExtendCostApi, { type ShopVo } from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';
import { buildStatResult, getPrevYearMonth } from '../common/statBuilder';
import { renderStatExcel } from '../common/excelRenderer';

const { Text } = Typography;

export interface BatchExportButtonProps {
  /** 渠道名，如「拼多多」 */
  channel: string;
  /** 当前选中的年月（来自 Base 搜索栏），格式 yyyy-MM */
  yearMonth: string;
}

/**
 * 拼多多 TAB - 导出当前选中月份的所有店铺统计费用
 *
 * 点击按钮 -> 拉取当前渠道全部店铺 -> 每家店调用 3 个接口
 * （getCostCategoryStat + 两次 queryEndingBalance）-> 生成 Excel ->
 * 全部打包成 zip 下载。
 *
 * 失败处理：失败的店铺仍生成空模板，但会把店名 + 失败原因写入 zip 内的
 * _失败明细.txt。
 */
const BatchExportButton: React.FC<BatchExportButtonProps> = ({ channel, yearMonth }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [shops, setShops] = useState<ShopVo[]>([]);
  const [fetchingShops, setFetchingShops] = useState(false);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [exportSummary, setExportSummary] = useState<{
    success: number;
    failed: number;
    zipName: string;
  } | null>(null);

  const fetchPddShops = async (): Promise<ShopVo[]> => {
    setFetchingShops(true);
    try {
      const params = {
        sortStr: '',
        searchStr: JSON.stringify({
          searchName: 'platform',
          searchValue: channel,
          searchType: 'like',
        }),
      };
      const res = await ChannelExtendCostApi.getShops(params);
      if (res.code === 200) {
        const list = (res.data || []).filter(
          (s) => s.platform === channel && s.id !== undefined && s.id !== null,
        );
        setShops(list);
        return list;
      }
      message.error('获取店铺列表失败');
      return [];
    } catch (e) {
      console.error('获取店铺列表失败:', e);
      message.error('获取店铺列表失败');
      return [];
    } finally {
      setFetchingShops(false);
    }
  };

  const openModal = async () => {
    setExportSummary(null);
    setFailures([]);
    setProgress({ current: 0, total: 0 });
    setShops([]);
    setModalOpen(true);
    await fetchPddShops();
  };

  const closeModal = () => {
    if (exporting) return;
    setModalOpen(false);
  };

  // 文件名去除 Windows 不允许的字符
  const safeName = (raw: string) => raw.replace(/[\/:*?"<>|]/g, '_');

  /**
   * 限并发的 map 实现（concurrency 个 worker 抢一个共享队列）
   */
  async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

    const prevYm = getPrevYearMonth(yearMonth);
    const zip = new JSZip();
    const localFailures: { name: string; reason: string }[] = [];
    let successCount = 0;

    await pMap(shops, 5, async (shop) => {
      const shopName = displayShopName(shop.wdtName || shop.shopName) || '';
      const fileBase = safeName(`${shopName}_${yearMonth}_站内外推广费统计`);
      const shopId = shop.id as number;
      try {
        // 1. 先拉取分类统计数据
        const statRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth });
        if (statRes.code !== 200) {
          throw new Error('getCostCategoryStat 返回非 200');
        }
        const rawStatData = statRes.data || [];

        // 2. 尝试从 stat 数据末尾提取余额项（PDD_BALANCE / PDD_LAST_BALANCE）
        const balanceItem = rawStatData.find((it) => it.businessCode === 'PDD_BALANCE');
        const lastBalanceItem = rawStatData.find((it) => it.businessCode === 'PDD_LAST_BALANCE');
        const hasInlineBalance = !!balanceItem || !!lastBalanceItem;

        // 过滤掉余额项，剩下的才是业务编码明细
        const statData = rawStatData.filter(
          (it) => it.businessCode !== 'PDD_BALANCE' && it.businessCode !== 'PDD_LAST_BALANCE',
        );

        let beginningBalance: number | null = null;
        let endingBalance: number | null = null;

        if (hasInlineBalance) {
          // 策略 1：stat 数据里直接带余额（拼多多新接口）
          if (lastBalanceItem && lastBalanceItem.totalIncome !== undefined && lastBalanceItem.totalIncome !== null) {
            beginningBalance = lastBalanceItem.totalIncome;
          }
          if (balanceItem && balanceItem.totalIncome !== undefined && balanceItem.totalIncome !== null) {
            endingBalance = balanceItem.totalIncome;
          }
        } else {
          // 策略 2：老逻辑，调两次 queryEndingBalance
          const [endingRes, beginningRes] = await Promise.all([
            ChannelExtendCostApi.queryEndingBalance({
              accountType: '期末余额',
              shopId,
              yearMonth,
            }),
            ChannelExtendCostApi.queryEndingBalance({
              accountType: '期末余额',
              shopId,
              yearMonth: prevYm,
            }),
          ]);
          endingBalance =
            endingRes.code === 200 && endingRes.data ? endingRes.data.incomeAmount ?? null : null;
          beginningBalance =
            beginningRes.code === 200 && beginningRes.data
              ? beginningRes.data.incomeAmount ?? null
              : null;
        }

        const result = buildStatResult({
          statData,
          beginningBalance,
          endingBalance,
          yearMonth,
          channel,
          shopName,
        });
        const blob = await renderStatExcel(result);
        zip.file(`${fileBase}.xlsx`, blob);
        successCount++;
      } catch (e: any) {
        console.error(`店铺 ${shopName} 导出失败:`, e);
        const reason = e?.message || '未知错误';
        localFailures.push({ name: shopName, reason });
        // 生成空模板，避免下载包里缺这家店
        try {
          const emptyResult = buildStatResult({
            statData: [],
            beginningBalance: null,
            endingBalance: null,
            yearMonth,
            channel,
            shopName,
          });
          const blob = await renderStatExcel(emptyResult);
          zip.file(`${fileBase}.xlsx`, blob);
        } catch (e2: any) {
          console.error(`店铺 ${shopName} 空模板生成也失败:`, e2);
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
      `已导出 ${successCount} 家店铺${localFailures.length > 0 ? `，${localFailures.length} 家失败` : ''}`,
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
                · 每店一个 Excel，含 2 个 Sheet：汇总校验 + 业务编码明细<br />
                · 样式尽量还原前端弹窗（合并单元格、底色、加粗、校验列染色）<br />
                · 失败的店铺会生成空模板，错误信息写入 zip 内的 _失败明细.txt
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

export default BatchExportButton;
