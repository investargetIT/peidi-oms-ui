import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/** 任务状态 */
export type UploadTaskStatus = 'pending' | 'running' | 'success' | 'failed';

/** 一次上传任务的元数据 */
export interface UploadTask {
  /** 任务唯一 id（前端生成） */
  id: string;
  /** 渠道名，如「抖音」 */
  channel: string;
  /** 关联的店铺名（仅展示） */
  shopName: string;
  /** 账单日期 yyyy-MM */
  billDate: string;
  /** 账单文件名 */
  fileName: string;
  /** 创建时间（毫秒） */
  createdAt: number;
  /** 状态 */
  status: UploadTaskStatus;
  /** 任务结束时间（成功/失败），毫秒 */
  finishedAt?: number;
  /** 后端返回的导入结果（成功时） */
  result?: any;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 是否被收起 */
  collapsed?: boolean;
}

interface UploadTaskContextValue {
  tasks: UploadTask[];
  /** 新增任务，立即返回 taskId */
  addTask: (task: Omit<UploadTask, 'id' | 'createdAt' | 'status'>) => string;
  /** 更新任务 */
  updateTask: (id: string, patch: Partial<UploadTask>) => void;
  /** 移除任务（仅清理已完成项） */
  removeTask: (id: string) => void;
  /** 全部清空（仅清已完成） */
  clearFinished: () => void;
  /** 切换折叠 */
  toggleCollapsed: (id: string) => void;
}

const UploadTaskContext = createContext<UploadTaskContextValue | null>(null);

export const useUploadTasks = (): UploadTaskContextValue => {
  const ctx = useContext(UploadTaskContext);
  if (!ctx) {
    throw new Error('useUploadTasks 必须在 UploadTaskProvider 内部使用');
  }
  return ctx;
};

/**
 * 全局上传任务 Store
 * 通过 React Context 把任务列表暴露给任意组件（弹窗、右侧卡片等）
 */
export const UploadTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const idCounterRef = useRef(0);

  const addTask: UploadTaskContextValue['addTask'] = useCallback((task) => {
    const id = `up_${Date.now()}_${++idCounterRef.current}`;
    const fullTask: UploadTask = {
      ...task,
      id,
      createdAt: Date.now(),
      status: 'running',
    };
    setTasks((prev) => [fullTask, ...prev]);
    return id;
  }, []);

  const updateTask: UploadTaskContextValue['updateTask'] = useCallback((id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTask: UploadTaskContextValue['removeTask'] = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearFinished: UploadTaskContextValue['clearFinished'] = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === 'running' || t.status === 'pending'));
  }, []);

  const toggleCollapsed: UploadTaskContextValue['toggleCollapsed'] = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, collapsed: !t.collapsed } : t)));
  }, []);

  const value = useMemo<UploadTaskContextValue>(
    () => ({ tasks, addTask, updateTask, removeTask, clearFinished, toggleCollapsed }),
    [tasks, addTask, updateTask, removeTask, clearFinished, toggleCollapsed],
  );

  return <UploadTaskContext.Provider value={value}>{children}</UploadTaskContext.Provider>;
};
