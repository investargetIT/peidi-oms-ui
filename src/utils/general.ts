//#region 工具方法
export const padDecimalToSpecifyPlaces = (
  value: number | string,
  decimalPlaces: number = 4,
): string => {
  const str = value.toString(); // 将数字转为字符串
  const parts = str.split('.'); // 按小数点分割整数部分和小数部分

  const integerPart = parts[0]; // 整数部分
  let decimalPart = parts[1] || ''; // 小数部分，默认为空字符串

  // 补足小数部分到指定位
  while (decimalPart.length < decimalPlaces) {
    decimalPart += '0';
  }

  // 拼接结果
  return `${integerPart}.${decimalPart}`;
};
//#endregion
