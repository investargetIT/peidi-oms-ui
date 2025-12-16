/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser; ddUserInfo?: any; parentByUser?: any } | undefined,
) {
  const { currentUser, ddUserInfo, parentByUser } = initialState ?? {};
  // console.log('#################', initialState);
  // 尝试从ddUserInfo中获取部门ID列表
  const ddDeptIds = ddUserInfo?.dept_id_list || [];
  // 尝试从parentByUser中获取部门ID列表
  const parentDeptIds = parentByUser?.parent_list?.[0]?.parent_dept_id_list || [];
  // console.log('parentDeptIds', parentDeptIds);
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    // 934791329在ddDeptIds就没权限，部门ID列表为空也没权限，开发环境下需要权限
    canInvoiceAudit: true, // 开放所有权限，在组件内部按钮做判断
    // canInvoiceAudit:
    //   process.env.NODE_ENV === 'development' ||
    //   (ddDeptIds.length > 0 && ddDeptIds[0] !== 934791329), // 销售综合部
    /** 前台用户只能查看 财务销售订单及发票 finance */
    // 暂时命名为通用权限，前台用户不是通用权限 后续有需要就每个组件都添加一种access
    // 前台部门id为854425488 信息部为939900386
    canGeneralPermissions: !parentDeptIds.includes(854425488),
  };
}
