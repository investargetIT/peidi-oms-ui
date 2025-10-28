import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Form, Input, message, Table } from 'antd';
import './editTable.scss';
import { financeObaPage, financeObaUpdate } from '@/services/ant-design-pro/api';

// 创建可编辑表格的上下文，用于在表格行和单元格之间共享表单实例
const EditableContext = React.createContext(null);

// 可编辑表格行组件 - 包装每一行，提供表单上下文
const EditableRow = ({ index, ...props }) => {
  // 创建表单实例
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      {/* 通过上下文提供表单实例给子组件 */}
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

// 可编辑表格单元格组件 - 处理单元格的编辑状态和保存逻辑
const EditableCell = ({
  title, // 列标题
  editable, // 是否可编辑
  children, // 子元素
  dataIndex, // 数据字段名
  record, // 当前行数据
  handleSave, // 保存回调函数
  ...restProps // 其他属性
}) => {
  // 编辑状态管理
  const [editing, setEditing] = useState(false);
  // 输入框引用
  const inputRef = useRef(null);
  // 从上下文获取表单实例
  const form = useContext(EditableContext);

  // 当进入编辑状态时自动聚焦输入框
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  // 切换编辑状态
  const toggleEdit = () => {
    setEditing(!editing);
    // 设置表单初始值为当前单元格的值
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  // 保存数据
  const save = async () => {
    try {
      // 验证表单字段
      const values = await form.validateFields();
      // 退出编辑状态
      toggleEdit();
      // 调用保存回调，传递更新后的数据
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  // 如果是可编辑列，显示编辑界面
  if (editable) {
    childNode = editing ? (
      // 编辑状态：显示输入框
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={
          [
            // { required: true, message: `${title} is required.` }
          ]
        }
      >
        <Input
          ref={inputRef}
          onPressEnter={save} // 按回车保存
          onBlur={save} // 失去焦点保存
        />
      </Form.Item>
    ) : (
      // 非编辑状态：显示可点击的文本
      <div
        className="editable-cell-value-wrap"
        style={{ paddingInlineEnd: 24 }}
        onClick={toggleEdit} // 点击进入编辑状态
      >
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

// 主应用组件
const EditTable = (props, ref) => {
  useImperativeHandle(ref, () => {
    return {
      dataSource,
    };
  });

  /**
   * OBA模板数据结构说明：
   * id: 记录ID
   * month: 月份
   * rowStatus: 行状态
   * lineId: ID
   * type: 单据类型
   * documentNum: 单号
   * date: 日期
   * shopId: 客户
   * shopName: 客户名称
   * priceIncludesTax: 价格含税
   * taxRate: 税组合
   * salesman: 业务员
   * department: 部门
   * lineStatus: 单行行状态
   * lineNumber: 行号
   * u9No: 料品
   * brand: 品牌
   * goodsNo: 货号
   * goodsName: 品名
   * specification: 规格
   * unitPrice: 单价
   * invoiceNum: 数量
   * remark: 销售订单行为商品类型
   * invoiceAmount: 销售订单行为合计
   * planLineStatus: 计划行行状态
   * subLineNumber: 子行号
   * deliveryDate: 交期
   * supplyType: 销售订单行为单行行优先类型
   */
  // 表格数据源状态
  const [dataSource, setDataSource] = useState([
    {
      id: 600,
      month: '2025-10',
      rowStatus: '正常',
      lineId: 1001,
      type: '销售订单',
      documentNum: 'SO202510001',
      date: '2025-10-15',
      shopId: 'C001',
      shopName: '测试客户A',
      priceIncludesTax: 'True',
      taxRate: '13%',
      salesman: '张三',
      department: '销售部',
      lineStatus: '已确认',
      lineNumber: '1000',
      u9No: '50402.0362',
      brand: '品牌A',
      goodsNo: 'G001',
      goodsName: '测试商品A',
      specification: '标准规格',
      unitPrice: 2.2725,
      invoiceNum: 8,
      remark: '常规订单',
      invoiceAmount: '18.1800',
      planLineStatus: '待发货',
      subLineNumber: '10',
      deliveryDate: '2025-10-20',
      supplyType: '当前组织出货',
    },
  ]);

  // 表格列配置
  const defaultColumns = [
    {
      title: 'keyID',
      dataIndex: 'id',
      width: 60,
      hidden: true,
    },
    {
      title: '行状态',
      dataIndex: 'rowStatus',
      editable: true,
      width: 80,
    },
    {
      title: 'ID',
      dataIndex: 'lineId',
      editable: true,
      width: 60,
    },
    {
      title: '单据类型',
      dataIndex: 'type',
      editable: true,
      width: 80,
    },
    {
      title: '单号',
      dataIndex: 'documentNum',
      editable: true,
      width: 80,
    },

    {
      title: '日期',
      dataIndex: 'date',
      editable: true,
      width: 120,
    },
    {
      title: '客户',
      dataIndex: 'shopId',
      editable: true,
      width: 60,
    },

    {
      title: '客户名称',
      dataIndex: 'shopName',
      editable: true,
      width: 80,
    },

    {
      title: '价格含税',
      dataIndex: 'priceIncludesTax',
      editable: true,
      width: 80,
    },
    {
      title: '税组合',
      dataIndex: 'taxRate',
      editable: true,
      width: 80,
    },
    {
      title: '业务员',
      dataIndex: 'salesman',
      editable: true,
      width: 80,
    },

    {
      title: '部门',
      dataIndex: 'department',
      editable: true,
      width: 80,
    },
    {
      title: () => {
        return (
          <div>
            单行
            <br />
            行状态
          </div>
        );
      },
      dataIndex: 'lineStatus',
      editable: true,
      width: 80,
    },
    {
      title: '行号',
      dataIndex: 'lineNumber',
      editable: true,
      width: 80,
    },
    {
      title: '料品',
      dataIndex: 'u9No',
      editable: true,
      width: 80,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      editable: true,
      width: 80,
    },
    {
      title: '货号',
      dataIndex: 'goodsNo',
      editable: true,
      width: 80,
    },
    {
      title: '品名',
      dataIndex: 'goodsName',
      editable: true,
      width: 80,
    },
    {
      title: '规格',
      dataIndex: 'specification',
      editable: true,
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      editable: true,
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'invoiceNum',
      editable: true,
      width: 80,
    },
    {
      title: () => {
        return (
          <div>
            销售订单行
            <br />
            免费品类型
          </div>
        );
      },
      dataIndex: 'remark',
      editable: true,
      width: 100,
    },
    {
      title: () => {
        return (
          <div>
            销售订单行
            <br />
            价税合计
          </div>
        );
      },
      dataIndex: 'invoiceAmount',
      editable: true,
      width: 80,
    },
    {
      title: () => {
        return (
          <div>
            计划行
            <br />
            行状态
          </div>
        );
      },
      dataIndex: 'planLineStatus',
      editable: true,
      width: 80,
    },
    {
      title: '子行号',
      dataIndex: 'subLineNumber',
      editable: true,
      width: 80,
    },
    {
      title: '交期',
      dataIndex: 'deliveryDate',
      editable: true,
      width: 120,
    },
    {
      title: '供应类型',
      dataIndex: 'supplyType',
      editable: true,
      width: 'auto',
    },

    {
      title: '月份',
      dataIndex: 'month',
      editable: true,
      width: 100,
      hidden: true,
    },

    {
      title: '合计',
      dataIndex: 'invoiceAmount',
      editable: true,
      width: 80,
      hidden: true,
    },
  ];

  // 保存数据的方法
  const handleSave = async (row) => {
    try {
      // 创建数据副本（避免直接修改原数据）
      const newData = [...dataSource];
      // 找到要修改的数据项的索引
      const index = newData.findIndex((item) => row.id === item.id);
      const item = newData[index];
      // 优化一下，只有修改了才发送请求
      if (JSON.stringify(item) === JSON.stringify(row)) {
        message.info('没有修改任何数据');
        return;
      }

      // 替换数据项
      newData.splice(index, 1, {
        ...item, // 保留原有属性
        ...row, // 应用新属性
      });

      // console.log('保存数据', row);
      // return;

      // 发送后端请求保存数据
      const updateResult = await financeObaUpdate(row);

      if (updateResult.code === 200) {
        console.log('数据保存成功', updateResult);
        message.success('数据保存成功');
        // *****成功才更新数据源*****
        setDataSource(newData);
      } else {
        console.error('数据保存失败:', updateResult.message);
        message.error('数据保存失败:' + updateResult.msg);
        // 可以在这里添加错误提示，比如使用 message.error()
      }
    } catch (error) {
      console.error('保存数据时发生错误:', error);
      // 可以在这里添加错误提示
    }
  };

  // 自定义表格组件配置
  const components = {
    body: {
      row: EditableRow, // 使用自定义行组件
      cell: EditableCell, // 使用自定义单元格组件
    },
  };

  // 处理列配置，为可编辑列添加单元格点击事件
  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col; // 不可编辑列直接返回
    }
    return {
      ...col,
      // 为可编辑列添加单元格属性
      onCell: (record) => ({
        record, // 当前行数据
        editable: col.editable, // 是否可编辑
        dataIndex: col.dataIndex, // 数据字段名
        title: col.title, // 列标题
        handleSave, // 保存回调函数
      }),
    };
  });

  // 分页获取oba模板数据
  useEffect(() => {
    fetchListPage();
  }, []);

  const fetchListPage = async () => {
    try {
      const res = await financeObaPage({ month: '2025-10', pageNo: 1, pageSize: 1000 });
      console.log('分页获取oba模板数据', res);
      if (res.code === 200) {
        setDataSource(res.data?.records || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      {/* 渲染表格 */}
      <Table
        components={components} // 自定义组件
        rowClassName={() => 'editable-row'} // 行样式类名
        bordered // 显示边框
        dataSource={dataSource} // 数据源
        columns={columns} // 列配置
        size="small"
        scroll={{ x: 'max-content', y: 600 }}
      />
    </div>
  );
};

export default forwardRef(EditTable);
