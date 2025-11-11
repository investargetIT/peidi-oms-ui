import { useState, useRef, useCallback, useEffect } from 'react';
import _ from 'lodash';

/**
 * 通用的防抖钩子
 * @param initialValue 初始值
 * @param delay 防抖延迟时间，默认500ms
 * @returns [实际值, 显示值, 处理函数]
 */
export const useDebounce = <T>(
  initialValue: T,
  delay: number = 500,
): [T, T, (value: T) => void] => {
  const [value, setValue] = useState<T>(initialValue);
  const [displayValue, setDisplayValue] = useState<T>(initialValue);

  const debouncedSetValue = useRef(
    _.debounce((newValue: T) => {
      setValue(newValue);
    }, delay),
  ).current;

  const handleChange = useCallback(
    (newValue: T) => {
      setDisplayValue(newValue);
      debouncedSetValue(newValue);
    },
    [debouncedSetValue],
  );

  // 组件卸载时取消防抖
  useEffect(() => {
    return () => {
      debouncedSetValue.cancel();
    };
  }, []);

  return [value, displayValue, handleChange];
};

/**
 * 专门用于字符串搜索的防抖钩子
 * @param initialValue 初始值
 * @param delay 防抖延迟时间，默认500ms
 * @returns [实际值, 显示值, 处理函数]
 */
export const useDebounceSearch = (initialValue: string = '', delay: number = 500) => {
  return useDebounce<string>(initialValue, delay);
};
