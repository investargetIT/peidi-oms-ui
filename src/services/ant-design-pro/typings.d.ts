// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    href?: string;
    avatar?: string;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type FakeCaptcha = {
    code?: number;
    status?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type PasswordParams = {
    old_password?: string;
    new_password?: string;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  type NoticeIconList = {
    data?: NoticeIconItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };

  type SuppliersListItem = {
    id?: string;
    code?: string;
    name?: string;
    bankAccount?: string;
    partnershipCase?: string;
    attribute?: string;
    mode?: string;
    hotel?: string;
    status?: string;
    contact?: string;
    position?: string;
    telephone?: string;
    salesman?: string;
    contractStatus?: string;
    dealDate?: string;
    startDate?: string;
    endDate?: string;
    remark?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type SuppliersList = {
    data?: SuppliersListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type GoodsListItem = {
    id?: string;
    internalCode?: string;
    externalCode?: string;
    name?: string;
    category?: string;
    picture?: string;
    brand?: string;
    details?: string;
    usageLocation?: string;
    unit?: string;
    boxStandards?: string;
    costPrice?: string;
    sellingPrice?: string;
    grossMargin?: string;
    supplierId?: string;
    goodsCategoryId?: string;
    leadTime?: string;
    moq?: string;
    remark?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type GoodsList = {
    data?: GoodsListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type GoodsCategoryItem = {
    id?: string;
    parentCategory?: string;
    category?: string;
    subCategory?: string;
    name?: string;
    attributes?: string;
    others?: string;
    remark?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type GoodsCategory = {
    data?: GoodsCategoryItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type CustomerListItem = {
    id?: string;
    code?: string;
    name?: string;
    province?: string;
    city?: string;
    district?: string;
    address?: string;
    contact?: string;
    telephone?: string;
    status?: string;
    brand?: string;
    attribute?: string;
    invoiceType?: string;
    invoiceTitle?: string;
    invoiceTitleTin?: string;
    invoiceTitleAddress?: string;
    invoiceTitleBank?: string;
    invoiceTitleBankAccount?: string;
    invoiceTitleTelephone?: string;
    invoiceReceiver?: string;
    invoiceReceiverTel?: string;
    invoiceReceiverAddress?: string;
    invoiceReceiverEmail?: string;
    remark?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type CustomerList = {
    data?: CustomerListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type OrdersListItem = {
    id?: string;
    code?: string;
    type?: string;
    goodsId?: string;
    deliveryNo?: string;
    deliveryNoRow?: string;
    invoiceName?: string;
    num?: string;
    purchaseMultiple?: string;
    taxRate?: string;
    priceWithoutTax?: string;
    price?: string;
    amountBeforeDiscount?: string;
    discount?: string;
    totalAmountWithoutTax?: string;
    totalAmount?: string;
    discountName?: string;
    discountType?: string;
    status?: string;
    receiveTime?: string;
    reviewStatus?: string;
    reviewTime?: string;
    returnReceiveTime?: string;
    customerId?: string;
    createTime?: string;
    takeTime?: string;
    deliveryTime?: string;
    signatureTime?: string;
    remark?: string;
    commissionRate?: string;
    commission?: string;
    paymentMethod?: string;
    onlinePaymentTransactionNo?: string;
    offlinePaymentBankInfo?: string;
    platformPaymentStatus?: string;
    vmiPaymentStatus?: string;
    isGsudaDelivery?: string;
    shippingWarehouseType?: string;
    services?: string;
    servicePriceAdjust?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type OrdersList = {
    data?: OrdersListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };
}
