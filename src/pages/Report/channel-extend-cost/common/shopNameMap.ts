/**
 * 店铺名称显示映射：部分店铺展示时替换为规范名称
 *
 * 新渠道只需要在这里加一行映射即可，所有 channel-extend-cost 子页面共享
 */
const shopNameDisplayMap: Record<string, string> = {
  '瑞驰派特-拼多多-萌宠嘉年华': '瑞驰派特-拼多多-帕特店',
};

/**
 * 获取店铺展示名称（命中映射表则返回规范名，否则原样返回）
 */
export const displayShopName = (name?: string): string | undefined =>
  name ? shopNameDisplayMap[name] || name : name;
