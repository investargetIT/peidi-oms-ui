import { FC, useRef } from 'react';
import { handleFormData, handleAntdTableData } from './utils/excel';
import EditTable from './editTable';
import { Button } from 'antd';

const Debug: FC = () => {
  const tableRef = useRef(null);
  const handleExport = () => {
    // handleFormData();return;
    console.log('tableRef?.current.dataSource', tableRef.current?.dataSource);
    if (tableRef.current?.dataSource) {
      handleAntdTableData(tableRef.current?.dataSource);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleExport}>
          导出
        </Button>
      </div>

      <EditTable ref={tableRef} />
    </>
  );
};

export default Debug;
