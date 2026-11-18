/**
 * 管报 / 成本核算 表格数字展示工具
 *
 * 约定：表格里的数字一律「原样输出为字符串」，后端返回几位小数就展示几位，
 * 前端不做四舍五入、不补零、不固定 2 位，避免自己舍弃精度。
 * （导出 Excel 同理：按同一份文本写单元格，不让 Excel 再按数字格式截断。）
 */

export type RawNumber = number | string | null | undefined;

const isBlank = (value: RawNumber): boolean =>
  value === null || value === undefined || value === '';

/**
 * 把科学计数法展开成普通小数文本（1e-7 -> 0.0000001），
 * 数字本身按 JSON 原样解析，展开过程不做任何位数的取舍。
 */
const expandExponential = (text: string): string => {
  const matched = /^-?(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(text);
  if (!matched) return text;
  const negative = text.startsWith('-');
  const intPart = matched[1];
  const decPart = matched[2] || '';
  const exp = Number(matched[3]);
  const digits = `${intPart}${decPart}`;
  const point = intPart.length + exp;
  let result: string;
  if (point <= 0) {
    result = `0.${'0'.repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    result = `${digits}${'0'.repeat(point - digits.length)}`;
  } else {
    result = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  result = result.replace(/^0+(?=\d)/, '');
  return negative ? `-${result}` : result;
};

/**
 * 数字原样转文本：
 * - number：走 String()（JS 的 number->string 为最短往返表示，不会丢精度）
 * - string：原样返回（后端若直接返回字符串，保留其末尾 0 / 位数）
 * - 空值：返回空串
 */
export const toRawText = (value: RawNumber): string => {
  if (isBlank(value)) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    const text = String(value);
    // 极小/极大值会变成 1e-7 这类科学计数法，展开成普通小数，避免表格里出现 e
    return /[eE]/.test(text) ? expandExponential(text) : text;
  }
  return String(value);
};

/**
 * 原样展示；空值用 emptyText 占位（表格默认 '-'，导出默认 ''）。
 */
export const toRawTextOr = (value: RawNumber, emptyText: string): string => {
  const text = toRawText(value);
  return text === '' ? emptyText : text;
};

/**
 * 纯字符串方式移动小数点（避免 0.07 * 100 = 7.000000000000001 这类浮点误差）。
 * 无法解析时原样返回。
 */
const shiftDecimalPoint = (text: string, places: number): string => {
  // 字符串形式的科学计数法（如 "1e-7"）先展开成普通小数
  const expanded = /[eE]/.test(text) ? expandExponential(text) : text;
  const s = expanded.trim();
  if (!s) return s;

  const negative = s.startsWith('-');
  const body = negative ? s.slice(1) : s;
  const [intRaw = '', decRaw = ''] = body.split('.');
  const digits = `${intRaw}${decRaw}`;
  if (!/\d/.test(digits)) return s;

  const point = intRaw.length + places;
  let result: string;
  if (point <= 0) {
    result = `0.${'0'.repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    result = `${digits}${'0'.repeat(point - digits.length)}`;
  } else {
    result = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  // 去掉整数部分多余的前导 0（保留一位）
  result = result.replace(/^0+(?=\d)/, '');
  return negative ? `-${result}` : result;
};

/**
 * 税率展示：后端给小数（0.09 表示 9%），按百分比展示且不丢精度。
 * 例：0.09 -> "9%"；0.0925 -> "9.25%"；空值 -> emptyText
 */
export const toTaxRatePercentText = (value: RawNumber, emptyText = '-'): string => {
  const text = toRawText(value);
  if (text === '') return emptyText;
  const percent = shiftDecimalPoint(text, 2);
  if (!/^-?\d/.test(percent)) return text;
  return `${percent}%`;
};

/**
 * 税率混合展示（京东系表格）：
 * - number（0.09）：按百分比展示
 * - string：后端已是展示文本，原样返回
 */
export const toTaxRateMixedText = (value: RawNumber, emptyText = '-'): string => {
  if (isBlank(value)) return emptyText;
  if (typeof value === 'number') return toTaxRatePercentText(value, emptyText);
  return String(value);
};
