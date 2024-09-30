// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>(process.env.USER_AUTH_BASE_URL + '/user/profile', {
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
  return request<API.LoginResult>(process.env.USER_AUTH_BASE_URL + '/auth/login', {
    method: 'POST',
    data: body,
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

/** 获取供应商 GET /suppliers/search */
export async function suppliers(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/suppliers/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,   // Map to 'page'
        size: pageSize,  // Map to 'size'
      },
    });

    return {
      data: response.data.content,
      total: response.data.totalElements,
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

/** 获取供应商id和name GET /suppliers/search */
export async function fetchSuppliers(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/suppliers/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,
        size: pageSize,
      },
    });

    const formattedData = response.data.content.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
    }));
    return {
      data: formattedData,
      total: response.data.totalElements,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 更新供应商 PUT /suppliers */
export async function updateSuppliers(id: string, data: any) {
  try {
    const response = await request<API.SuppliersListItem>(`/suppliers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
      data,
    });
    return response;
  } catch (error) {
    console.error('Failed to update supplier:', error);
    throw error;
  }
}


/** 新建供应商 POST /suppliers */
export async function addSuppliers(options?: { [key: string]: any }) {
  return request<API.SuppliersListItem>('/suppliers', {
    method: 'POST',
    data:{
      ...(options || {}),
    }
  });
}

/** 删除供应商 DELETE /suppliers/batch */
export async function removeSuppliers(ids: any) {
  try {
    const response = await request<API.SuppliersListItem>(`/suppliers/batch`, {
      method: 'DELETE',
      data: {ids},
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
    });
    return response;
  } catch (error) {
    console.error('Failed to update supplier:', error);
    throw error;
  }
}

/** OSS图片上传 POST /upload */
export async function fileUpload(params: any) {
  const { filename, file } = params;
  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('file', file);
  try {
    const response = await request('/upload', {
      method: 'POST',
      data: formData,
    });
    // console.log(response)
    return response;
  } catch (error) {
    console.error('Failed to upload:', error);
    throw error;
  }
}

/** 获取商品 GET /goods/search */
export async function goods(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/goods/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,   // Map to 'page'
        size: pageSize,  // Map to 'size'
      },
    });
    return {
      data: response.data.content,
      total: response.data.totalElements,
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

/** 获取商品部分信息 GET /goods/search */
export async function fetchGoods(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/goods/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,
        size: pageSize,
      },
    });
    const formattedData = response.data.content.map(goods => ({
      id: goods.id,
      name: goods.name,
      // goodsCategoryName: goods.goodsCategory && goods.goodsCategory.name, // 如果为空使用默认值
    }));
    return {
      data: formattedData,
      total: response.data.totalElements,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching goods:', error);
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 更新商品 PUT /goods */
export async function updateGoods(id: string, data: any) {
  try {
    const response = await request<API.GoodsListItem>(`/goods/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
      data,
    });
    return response;
  } catch (error) {
    console.error('Failed to update goods:', error);
    throw error;
  }
}


/** 新建商品 POST /goods */
export async function addGoods(options?: { [key: string]: any }) {
  return request<API.GoodsListItem>('/goods', {
    method: 'POST',
    data:{
      ...(options || {}),
    }
  });
}

/** 删除商品 DELETE /goods/batch */
export async function removeGoods(ids: any) {
  try {
    const response = await request<API.GoodsListItem>(`/goods/batch`, {
      method: 'DELETE',
      data: {ids},
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
    });
    return response;
  } catch (error) {
    console.error('Failed to delete goods:', error);
    throw error;
  }
}

/** 获取商品品类 GET /goods/categories */
export async function goodsCategory(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/goods/categories', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,   // Map to 'page'
        size: pageSize,  // Map to 'size'
      },
    });
    return {
      data: response.data.content,
      total: response.data.totalElements,
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

/** 获取商品品类的id、类别、name GET /goods/categories */
export async function fetchGoodsCategory(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/goods/categories', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,
        size: pageSize,
      },
    });
    const formattedData = response.data.content.map(goodsCategory => ({
      id: goodsCategory.id,
      parentCategory: goodsCategory.parentCategory,
      category: goodsCategory.category,
      subCategory: goodsCategory.subCategory,
      name: goodsCategory.name,
    }));
    return {
      data: formattedData,
      total: response.data.totalElements,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching goodsCategories:', error);
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 更新商品品类 PUT /goods/categories */
export async function updateGoodsCategory(id: string, data: any) {
  try {
    const response = await request<API.GoodsCategoryItem>(`/goods/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
      data,
    });
    return response;
  } catch (error) {
    console.error('Failed to update goodsCategories:', error);
    throw error;
  }
}


/** 新建商品品类 POST /goods */
export async function addGoodsCategory(options?: { [key: string]: any }) {
  return request<API.GoodsCategoryItem>('/goods/categories', {
    method: 'POST',
    data:{
      ...(options || {}),
    }
  });
}

/** 删除商品品类 DELETE /goods/categories */
export async function removeGoodsCategory(ids: any) {
  try {
    const response = await request<API.GoodsCategoryItem>(`/goods/categories/batch`, {
      method: 'DELETE',
      data: {ids},
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
    });
    return response;
  } catch (error) {
    console.error('Failed to delete goodsCategory:', error);
    throw error;
  }
}

/** 获取客户信息 GET /customers/search */
export async function customer(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/customers/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,   // Map to 'page'
        size: pageSize,  // Map to 'size'
      },
    });
    return {
      data: response.data.content,
      total: response.data.totalElements,
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

/** 获取客户部分信息 GET /customers/search */
export async function fetchCustomer(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/customers/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,
        size: pageSize,
      },
    });
    const formattedData = response.data.content.map(customers => ({
      id: customers.id,
      name: customers.name,
    }));
    return {
      data: formattedData,
      total: response.data.totalElements,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

/** 更新客户信息 PUT /customers */
export async function updateCustomer(id: string, data: any) {
  try {
    const response = await request<API.CustomerListItem>(`/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
      data,
    });
    return response;
  } catch (error) {
    console.error('Failed to update customer:', error);
    throw error;
  }
}


/** 新建客户信息 POST /customers */
export async function addCustomer(options?: { [key: string]: any }) {
  return request<API.CustomerListItem>('/customers', {
    method: 'POST',
    data:{
      ...(options || {}),
    }
  });
}

/** 删除客户信息 DELETE /customers/batch */
export async function removeCustomer(ids: any) {
  try {
    const response = await request<API.CustomerListItem>(`/customers/batch`, {
      method: 'DELETE',
      data: {ids},
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
    });
    return response;
  } catch (error) {
    console.error('Failed to delete customer:', error);
    throw error;
  }
}

/** 获取订单信息 GET /orders/search */
export async function order(params: API.PageParams) {
  const { current, pageSize, ...restParams } = params;
  try {
    const response = await request('/orders/search', {
      method: 'GET',
      params: {
        ...restParams,
        page: current - 1,   // Map to 'page'
        size: pageSize,  // Map to 'size'
      },
    });
    return {
      data: response.data.content,
      total: response.data.totalElements,
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

/** 更新订单信息 PUT /orders */
export async function updateOrder(id: string, data: any) {
  try {
    const response = await request<API.OrdersListItem>(`/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
      data,
    });
    return response;
  } catch (error) {
    console.error('Failed to update orders:', error);
    throw error;
  }
}


/** 新建订单信息 POST /orders */
export async function addOrder(options?: { [key: string]: any }) {
  return request<API.OrdersListItem>('/orders', {
    method: 'POST',
    data:{
      ...(options || {}),
    }
  });
}

/** 删除订单信息 DELETE /orders/batch */
export async function removeOrder(ids: any) {
  try {
    const response = await request<API.OrdersListItem>(`/orders/batch`, {
      method: 'DELETE',
      data: {ids},
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证 token，请在 headers 中添加
      },
    });
    return response;
  } catch (error) {
    console.error('Failed to delete orders:', error);
    throw error;
  }
}
