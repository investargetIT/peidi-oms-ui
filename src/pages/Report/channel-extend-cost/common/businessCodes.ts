/**
 * 汇总分组配置
 * 站内外推广费统计 - 「本期收款 / 扣款 / 提现」汇总时按业务编码分组
 *
 * ⚠️ 当前所有渠道共用同一套业务编码配置。
 * 如果后续发现某个渠道（拼多多 / 天猫 / 抖音 / 京东）的业务编码有差异，
 * 建议在对应渠道目录下建立自己的 businessCodes.ts 覆盖这里的导出。
 */
export const summaryGroups: { name: string; codes: string[] }[] = [
  {
    name: '收款',
    codes: [
      '0010002',
      '0010005',
      '0020002',
      '0020005',
      '0040001',
      '0040002',
      '0040003',
      '0040014',
      '0090001',
      '0130005',
      '0140002',
      '0090002',
      '0130010',
    ],
  },
  {
    name: '扣款',
    codes: [
      '0030001',
      '0030002',
      '0030003',
      '0030023',
      '0040004',
      '0040005',
      '0050002',
      '0060001',
      '0040006',
      '0070004',
    ],
  },
  {
    name: '提现',
    codes: ['0080001'],
  },
];

/**
 * 业务编码分类配置（明细表格左侧"分类"列）
 */
export const feeCategories: { name: string; codes: string[] }[] = [
  { name: '运费险', codes: ['0050002'] },
  { name: '技术服务费', codes: ['0030001', '0030002', '0030003', '0030023'] },
  { name: '赔付', codes: ['0040004', '0040005', '0040006'] },
  { name: '多多进宝', codes: ['0060001'] },
  { name: '好评有礼', codes: ['0070004'] },
  { name: '全站推广费', codes: ['PDD_PROMOTION'] },
];

/**
 * 根据业务编码获取所属分类名称，未匹配的归入"其他"
 */
export const getFeeCategory = (businessCode: string): string => {
  const found = feeCategories.find((c) => c.codes.includes(businessCode));
  return found ? found.name : '其他';
};

/**
 * 分类展示顺序：配置的分类在前，"其他"在最后
 */
export const feeCategoryOrder: string[] = [...feeCategories.map((c) => c.name), '其他'];

/**
 * 一级大类配置（明细表格最左侧"分类"列的更高一级聚合）
 */
export const feeMajorCategories: { name: string; categories: string[] }[] = [
  { name: '平台费用', categories: ['运费险', '技术服务费', '赔付'] },
  { name: '推广费用', categories: ['多多进宝', '好评有礼', '全站推广费'] },
  { name: '其他', categories: ['其他'] },
];

/**
 * 根据分类名称获取所属一级大类
 */
export const getFeeMajorCategory = (categoryName: string): string => {
  const found = feeMajorCategories.find((m) => m.categories.includes(categoryName));
  return found ? found.name : '其他';
};

/**
 * 一级大类展示顺序
 */
export const feeMajorCategoryOrder: string[] = feeMajorCategories.map((m) => m.name);
