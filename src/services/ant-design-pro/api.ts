// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  const token = localStorage.getItem('token');
  return request<{
    data: API.CurrentUser;
  }>(process.env.USER_AUTH_BASE_URL + '/user/user-check?token=' + token, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('http://localhost:8000/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>(process.env.USER_AUTH_BASE_URL + '/user/login/password', {
    method: 'POST',
    data: `username=${body.username}&password=${body.password}`,
    ...(options || {}),
  });
}

/** 更新用户密码 PUT /orders */
export async function updatePassword(body: API.PasswordParams, options?: { [key: string]: any }) {
  return request<{
  }>(process.env.USER_AUTH_BASE_URL + '/user/change-password', {
    method: 'POST',
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('http://localhost:8000/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('http://localhost:8000/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('http://localhost:8000/api/rule', {
    method: 'POST',
    data:{
      method: 'update',
      ...(options || {}),
    }
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('http://localhost:8000/api/rule', {
    method: 'POST',
    data:{
      method: 'post',
      ...(options || {}),
    }
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('http://localhost:8000/api/rule', {
    method: 'POST',
    data:{
      method: 'delete',
      ...(options || {}),
    }
  });
}

/** 获取订单店铺信息 GET /orders/shopTarget **/
export async function shopTarget(params: API.PageParams) {
  try {
    const response = await request(`/orders/shopTarget`);
    return {
      data: response.data,
      total: response.data.total,
      success: true,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 获取客户复购率信息 GET /orders/salesOutDetails **/
export async function salesOutDetails(params: API.PageParams) {
  const { searchStr } = params;
  try {
    const response = await request(`/orders/salesOutDetails?searchStr=${searchStr}`);
    return {
      data: response.data,
      total: response.data.total,
      success: true,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 获取客户复购率分页信息 GET /orders/salesOutDetails-page **/
export async function salesOutDetailsPage(params: API.PageParams) {
  const { page, pageSize, searchStr, groupStr } = params;
  try {
    const response = await request(`/orders/salesOutDetails-page?pageNo=${page}&pageSize=${pageSize}&searchStr=${searchStr}&groupStr=${groupStr}`);
    return {
      data: response.data.records,
      total: response.data.total,
      success: true,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

export async function salesOutDetailsRepeatPage(params: API.PageParams) {
  const { page, pageSize, searchStr, groupStr } = params;
  try {
    const response = await request(`/orders/salesOutDetails-repeat-page?pageNo=${page}&pageSize=${pageSize}&searchStr=${searchStr}&groupStr=${groupStr}`);
    return {
      data: response.data.records,
      total: response.data.total,
      success: true,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}
