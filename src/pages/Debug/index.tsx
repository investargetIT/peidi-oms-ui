import { FC, useRef, useState } from 'react';
import { handleFormData, handleAntdTableData } from './utils/excel';
import EditTable from './editTable';
import { Button, message } from 'antd';

const Debug: FC = () => {
  const [excelLoading, setExcelLoading] = useState(false);
  const tableRef = useRef(null);
  const handleExport = async () => {
    setExcelLoading(true);
    console.log('tableRef?.current.dataSource', tableRef.current?.dataSource);
    if (tableRef.current?.dataSource) {
      // handleAntdTableData(tableRef.current?.dataSource);
      try {
        await handleFormData(tableRef.current?.dataSource);
      } catch (error) {
        console.log(error);
        message.error('导出失败');
      }

      setExcelLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleExport} loading={excelLoading} iconPosition="end">
          导出 Excel
        </Button>
      </div>

      <EditTable ref={tableRef} />
    </>
  );
};

export default Debug;
