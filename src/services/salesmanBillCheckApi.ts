import { createRequest, ResponseData } from './axiosRequest';

export interface PageResponse<T> {
  data: {
    records: T[];
    current: number;
    size: number;
    total: number;
    pages?: number;
    [key: string]: any;
  };
  code: number;
  msg: string;
  success?: boolean;
}

export interface PageParams {
  pageNum?: number;
  pageSize?: number;
  isChecked?: number;
  userId?: number;
  username?: string;
  [key: string]: any;
}

export interface SalesmanBillCheckVo {
  checkedDate?: string;
  createdAt?: string;
  id?: number;
  isChecked?: number;
  originalFilePath?: string;
  splitFilePath?: string;
  updatedAt?: string;
  userId?: number;
  username?: string;
  [key: string]: any;
}

// 创建销售员账单核对的axios实例
const salesmanBillCheckRequest = createRequest(`${process.env.BASE_URL}/Salesman_bill_check`, {
  timeout: 1000 * 60,
});
// 测试环境使用
// const salesmanBillCheckRequest = createRequest(`http://12.18.1.36:8085/oms/Salesman_bill_check`, {
//   timeout: 15000,
// });

// 销售员账单核对API类
export class SalesmanBillCheckApi {
  /**
   * 上传核算数据
   */
  static async upload(data: {
    date: string;
    uploadUserId: number;
    file: File;
  }): Promise<ResponseData<any>> {
    const formData = new FormData();
    formData.append('date', data.date);
    formData.append('uploadUserId', String(data.uploadUserId));
    formData.append('file', data.file);
    return salesmanBillCheckRequest.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * 分页查询
   */
  static async getPage(params: PageParams): Promise<PageResponse<SalesmanBillCheckVo>> {
    return salesmanBillCheckRequest.post('/page', {
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 10,
      ...params,
    });
  }

  /**
   * 核对
   */
  static async check(id: number): Promise<ResponseData<any>> {
    return salesmanBillCheckRequest.post(`/check/${id}`);
  }

  /**
   * 删除
   */
  static async delete(data: { date: string; userId: number }): Promise<ResponseData<any>> {
    return salesmanBillCheckRequest.delete('/delete', {
      params: data,
    });
  }
}

// 默认导出实例
export default SalesmanBillCheckApi;

// 导出请求实例，方便其他地方使用
export { salesmanBillCheckRequest };
