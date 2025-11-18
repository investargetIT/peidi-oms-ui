/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser; ddUserInfo?: any } | undefined,
) {
  const { currentUser, ddUserInfo } = initialState ?? {};
  // console.log('#################', initialState);
  // 尝试从ddUserInfo中获取部门ID列表
  const ddDeptIds = ddUserInfo?.dept_id_list || [];
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    // 934791329在ddDeptIds就没权限，部门ID列表为空也没权限，开发环境下需要权限
    canInvoiceAudit: true, // 开放所有权限，在组件内部按钮做判断
    // canInvoiceAudit:
    //   process.env.NODE_ENV === 'development' ||
    //   (ddDeptIds.length > 0 && ddDeptIds[0] !== 934791329), // 销售综合部
  };
}
