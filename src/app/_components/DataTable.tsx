import DataTable from '~/app/_components/data-table/DataTable';
export { EditableCell } from '~/app/_components/data-table/EditableCell';
export { EditableColumnHeader } from '~/app/_components/data-table/EditableColumnHeader';
export { TableToolbar } from '~/app/_components/data-table/TableToolbar';

export type { 
  Column, 
  Cell, 
  Row, 
  Table, 
  DataTableProps, 
  FilterType,
  FilterRecord,
  EditableColumnHeaderProps,
  EditableCellProps,
  TableToolbarProps
} from '~/app/_components/data-table/types';

export default DataTable;