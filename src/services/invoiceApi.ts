import { createRequest, ResponseData } from './axiosRequest';

export interface PageResponse<T> {
  data: {
    records: T[];
    current: number;
    size: number;
    total: number;
    // 还有更多字段，用泛型表示
    [key: string]: any;
  };
  code: number;
  msg: string;
}

export interface PageParams {
  pageNo?: number;
  pageSize?: number;
  [key: string]: any;
}

export interface InvoiceCustomer {
  channel: string;
  customerName: string;
  tax: string;
  type: string;
}

// 创建发票服务的axios实例
const invoiceRequest = createRequest(`${process.env.BASE_URL}/invoice`, {
  timeout: 15000, // 发票服务可以设置更长的超时时间
});

// 简洁的财务开票API类
export class InvoiceApi {
  /**
   * 分页获取客户信息
   */
  static async getInvoiceCustomerPage(params: PageParams): Promise<PageResponse<any>> {
    return invoiceRequest.get('/customer/page', {
      params: {
        pageNo: params.pageNo || 1,
        pageSize: params.pageSize || 10,
        ...params,
      },
    });
  }

  /**
   * 增加客户信息
   */
  static async postInvoiceCustomerNew(data: InvoiceCustomer): Promise<ResponseData<any>> {
    return invoiceRequest.post('/customer/new', data);
  }

  /**
   * 删除客户信息
   */
  static async postInvoiceCustomerDelete(data: number[]): Promise<ResponseData<any>> {
    return invoiceRequest.post('/customer/delete', data);
  }

  /**
   * 分页获取开票申请
   */
  static async getInvoiceNoAppPage(params: PageParams): Promise<PageResponse<any>> {
    return invoiceRequest.get('/noApp/page', {
      params: {
        pageNo: params.pageNo || 1,
        pageSize: params.pageSize || 10,
        ...params,
      },
    });
  }

  /**
   * 修改开票状态
   */
  static async postInvoiceApp(data: any[]): Promise<ResponseData<any>> {
    return invoiceRequest.post('/app', data);
  }

  /**
   * 分页获取开票审核
   */
  static async getInvoiceAppPage(params: PageParams): Promise<PageResponse<any>> {
    return invoiceRequest.get('/app/page', {
      params: {
        pageNo: params.pageNo || 1,
        pageSize: params.pageSize || 10,
        ...params,
      },
    });
  }
}

// 默认导出实例
export default InvoiceApi;

// 导出请求实例，方便其他地方使用
export { invoiceRequest };
