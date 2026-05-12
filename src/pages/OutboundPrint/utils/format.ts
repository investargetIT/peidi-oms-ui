// 数据格式化
export const formatOutboundPrintData = (data: any[]) => {
  //   console.log('原始数据:', data);
  const temp: any[] = [];
  data.forEach((item) => {
    if (item['单据编号']) {
      // 先去temp里找是否有 客户+单据日期+单据编号 相同的项
      const exist = temp.find(
        (i) =>
          i['客户'] === item['客户'] &&
          i['单据日期'] === item['单据日期'] &&
          i['单据编号'] === item['单据编号'],
      );
      if (exist) {
        // 如果有，就在dataList里加入该项
        exist.dataList.push(item);
      } else {
        temp.push({
          ...item,
          dataList: [item],
        });
      }
    }
  });
  console.log('整理后的数据:', temp);
  return temp;
};
