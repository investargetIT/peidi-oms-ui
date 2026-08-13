import React, { useEffect, useState } from "react";
import { Badge, Button, Empty, Popconfirm, Spin, Tooltip, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  FileExcelOutlined,
  LoadingOutlined,
  MinusOutlined,
  PlusOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { useUploadTasks, type UploadTask } from "./uploadTaskStore";

const { Text } = Typography;

const formatDuration = (ms: number): string => {
  if (ms < 1000) return ms + "ms";
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + "秒";
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return m + "分" + rs + "秒";
  const h = Math.floor(m / 60);
  return h + "时" + (m % 60) + "分" + rs + "秒";
};

interface TaskItemProps {
  task: UploadTask;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onRemove, onToggle }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (task.status !== "running") return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [task.status]);

  const elapsed = (task.finishedAt || Date.now()) - task.createdAt;
  const isRunning = task.status === "running";
  const isSuccess = task.status === "success";
  const isFailed = task.status === "failed";

  const statusIcon = isRunning ? (
    <LoadingOutlined style={{ color: "#2f54eb" }} spin />
  ) : isSuccess ? (
    <CheckCircleOutlined style={{ color: "#52c41a" }} />
  ) : (
    <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
  );

  const statusText = isRunning ? "上传中" : isSuccess ? "已完成" : "失败";
  const statusColor = isRunning ? "#2f54eb" : isSuccess ? "#52c41a" : "#ff4d4f";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {statusIcon}
        <Text
          strong
          style={{
            fontSize: 12,
            color: statusColor,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.channel} · {task.shopName} · {task.billDate}
        </Text>
        {!isRunning && (
          <Popconfirm
            title="确定删除该任务？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, size: 'small' }}
            onConfirm={() => onRemove(task.id)}
          >
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              style={{ width: 22, height: 22, padding: 0 }}
            />
          </Popconfirm>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
        <FileExcelOutlined />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.fileName}
        </span>
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#666" }}>
        <span>状态：{statusText}</span>
        <span>·</span>
        <span>{isRunning ? "已用时" : "耗时"} {formatDuration(elapsed)}</span>
      </div>
      {isRunning && (
        <div style={{ marginTop: 6 }}>
          <Spin size="small" /> <Text type="secondary" style={{ fontSize: 11 }}>后端正在处理，请耐心等待...</Text>
        </div>
      )}
      {isSuccess && task.result && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#52c41a" }}>
          成功 {task.result.successCount ?? 0} 条 / 共 {task.result.totalCount ?? 0} 条
        </div>
      )}
      {isFailed && (
        <div style={{ marginTop: 6 }}>
          <Text type="danger" style={{ fontSize: 11 }}>
            {task.errorMessage || "上传失败"}
          </Text>
        </div>
      )}
      {isSuccess && task.result && (
        <div style={{ marginTop: 6 }}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontSize: 11 }}
            onClick={() => onToggle(task.id)}
          >
            {task.collapsed ? <DownOutlined /> : <UpOutlined />} {task.collapsed ? "展开明细" : "收起明细"}
          </Button>
          {!task.collapsed && (
            <div style={{ marginTop: 4, background: "#fafafa", borderRadius: 4, padding: 6, fontSize: 11 }}>
              <div>总记录数：{task.result.totalCount ?? 0}</div>
              <div style={{ color: "#52c41a" }}>成功：{task.result.successCount ?? 0}</div>
              <div style={{ color: "#ff4d4f" }}>失败：{task.result.failCount ?? 0}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const UploadTaskDrawer: React.FC = () => {
  const { tasks, removeTask, clearFinished, toggleCollapsed } = useUploadTasks();
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (tasks.length === 0) setMinimized(true);
  }, [tasks.length]);

  if (tasks.length === 0) return null;

  const runningCount = tasks.filter((t) => t.status === "running").length;
  const finishedCount = tasks.length - runningCount;

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1000,
        width: 340,
        maxHeight: "70vh",
        background: "#fff",
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "#2f54eb",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setMinimized((v) => !v)}
      >
        <Badge count={runningCount} size="small" offset={[-2, 2]}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>上传任务</span>
        </Badge>
        <span style={{ fontSize: 11, opacity: 0.85, flex: 1 }}>
          共 {tasks.length} 个，{runningCount} 个进行中
        </span>
        <Tooltip title={minimized ? "展开" : "收起"}>
          <Button
            type="text"
            size="small"
            icon={minimized ? <PlusOutlined /> : <MinusOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setMinimized((v) => !v);
            }}
            style={{ color: "#fff" }}
          />
        </Tooltip>
      </div>

      {!minimized && (
        <>
          <div
            style={{
              padding: "6px 12px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#666",
            }}
          >
            <span>共 {tasks.length} 个任务</span>
            {finishedCount > 0 && (
              <Popconfirm
                title="确定清空已完成任务？"
                onConfirm={() => {
                  clearFinished();
                  message.success("已清空");
                }}
                okText="清空"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  清空已完成
                </Button>
              </Popconfirm>
            )}
          </div>

          <div
            style={{
              padding: 10,
              overflowY: "auto",
              flex: 1,
              maxHeight: "calc(70vh - 90px)",
              background: "#f5f5f5",
            }}
          >
            {tasks.length === 0 ? (
              <Empty description="暂无任务" imageStyle={{ height: 60 }} />
            ) : (
              tasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onRemove={removeTask}
                  onToggle={toggleCollapsed}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UploadTaskDrawer;
