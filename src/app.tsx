import { Footer, Question, SelectLang, AvatarDropdown, AvatarName } from '@/components';
import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { currentUser as queryCurrentUser, getParentByUser } from '@/services/ant-design-pro/api';
import React, { useEffect, useState } from 'react';
import { NProgress } from '@tanem/react-nprogress';
const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
const dingTalkLoginFree = '/user/dd';

// 创建全局请求状态管理（不导出，通过事件监听）
let requestCount = 0;
let lastRequestTime = 0;
const requestListeners: Array<(loading: boolean) => void> = [];

// 进度条状态管理函数（不导出）
const startLoading = () => {
  const now = Date.now();
  // 如果距离上次请求超过500ms，认为是新请求，重置进度
  if (now - lastRequestTime > 500) {
    requestCount = 0;
  }
  lastRequestTime = now;

  requestCount++;
  if (requestCount === 1) {
    requestListeners.forEach((listener) => listener(true));
  }
};

const stopLoading = () => {
  requestCount = Math.max(0, requestCount - 1);
  if (requestCount === 0) {
    // 延迟300ms再隐藏进度条，确保完成动画能播放
    setTimeout(() => {
      requestListeners.forEach((listener) => listener(false));
    }, 300);
  }
};

// 将进度条管理函数挂载到全局对象，供外部使用
if (typeof window !== 'undefined') {
  (window as any).__nprogress = {
    startLoading,
    stopLoading,
  };
}

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  ddUserInfo?: any;
  parentByUser?: any;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg: any = await queryCurrentUser({
        skipErrorHandler: true,
      });
      // 存入localStorage
      localStorage.setItem('user-check', JSON.stringify(msg.data));
      const parentByUser = await getParentByUser(msg.data.dingId, {
        skipErrorHandler: true,
      });
      // 存入localStorage
      if (parentByUser.data) {
        localStorage.setItem('parentByUser', JSON.stringify(parentByUser.data));
      }
      return { ...msg.data, name: msg.data.username + '' };
    } catch (error) {
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== loginPath && location.pathname !== dingTalkLoginFree) {
    const currentUser = await fetchUserInfo();

    //#region 权限逻辑
    //尝试获取ddUserInfo
    const ddUserInfo = JSON.parse(localStorage.getItem('ddUserInfo') || '{}');
    const parentByUser = JSON.parse(localStorage.getItem('parentByUser') || '{}');
    //#endregion

    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
      ddUserInfo,
      parentByUser,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    // 注册请求状态监听器
    const listener = (loading: boolean) => {
      setIsAnimating(loading);

      if (loading) {
        // 开始新的进度条动画
        setProgress(0);

        // 模拟进度条前进
        // const interval = setInterval(() => {
        // 清理之前的定时器
        if (intervalId) {
          clearInterval(intervalId);
        }

        intervalId = setInterval(() => {
          setProgress((prev) => {
            // 匀速前进到95%
            const newProgress = prev + 0.05;
            return Math.min(newProgress, 0.95);
          });
        }, 100);

        // 清理定时器
        // return () => clearInterval(interval);
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        // 请求完成，进度条到100%然后消失
        setProgress(1);
        setTimeout(() => {
          setIsAnimating(false);
          setProgress(0);
        }, 300);
      }
    };

    requestListeners.push(listener);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      // 清理监听器
      const index = requestListeners.indexOf(listener);
      if (index > -1) {
        requestListeners.splice(index, 1);
      }
    };
  }, []);

  return {
    // actionsRender: () => [<Question key="doc" />, <SelectLang key="SelectLang" />],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    // links: isDev
    //   ? [
    //       <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
    //         <LinkOutlined />
    //         <span>OpenAPI 文档</span>
    //       </Link>,
    //     ]
    //   : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {/* 自定义进度条组件 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: 3,
              backgroundColor: 'rgba(24, 144, 255, 0.1)',
              zIndex: 1031,
              overflow: 'hidden',
              opacity: isAnimating ? 1 : 0,
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease-out',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progress * 100}%`,
                background:
                  progress === 1
                    ? 'linear-gradient(90deg, #1890ff, #096dd9, #0050b3)'
                    : 'linear-gradient(90deg, #1890ff, #40a9ff, #69c0ff)',
                transition: progress === 1 ? 'width 0.3s ease-out' : 'width 0.1s linear',
                boxShadow:
                  progress === 1
                    ? '0 0 12px rgba(24, 144, 255, 0.8)'
                    : '0 0 8px rgba(24, 144, 255, 0.6)',
                borderRadius: '0 2px 2px 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '100%',
                  width: '30px',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent)',
                  animation: 'nprogress-shine 2s infinite',
                }}
              />
            </div>
          </div>

          <style>{`
            @keyframes nprogress-shine {
              0% {
                transform: translateX(-30px);
              }
              100% {
                transform: translateX(200px);
              }
            }
          `}</style>

          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  baseURL: process.env.BASE_URL,
  ...errorConfig,
};
