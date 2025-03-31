import type { 
    SortingState, 
    ColumnFiltersState, 
    ColumnSort 
  } from "@tanstack/react-table";
  
  // Define proper interfaces for your data structures
  export interface Column {
    id: string;
    name: string;
    type: string;
    tableId: string;
  }
  
  export interface Cell {
    id: string;
    rowId: string;
    columnId: string;
    value: string;
  }
  
  export interface Row {
    id: string;
    tableId: string;
    cells: Cell[];
  }
  
  export interface Table {
    id: string;
    name: string;
    columns: Column[];
    rows: Row[];
  }
  
  export interface DataTableProps {
    tableId: string;
  }
  
  // Define proper filter type
  export type FilterType =
    | "contains"
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "lessThan";
  
  // Define filter record type that matches your backend schema
  export type FilterRecord = Record<
    string,
    {
      type: FilterType;
      value: string;
    }
  >;
  
  // Types for extracted components
  export interface EditableColumnHeaderProps {
    column: Column;
    isEditing: boolean;
    editValue: string;
    editType: string;
    onEditChange: (value: string) => void;
    onTypeChange: (type: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onStartEdit: () => void;
    onDelete: () => void;
    hasNonNumericValues: boolean;
  }
  
  export interface EditableCellProps {
    value: string;
    isEditing: boolean;
    editValue: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onStartEdit: () => void;
    isNumberType: boolean;
    validationError: string | null;
  }
  
  export interface TableToolbarProps {
    onAddColumn: () => void;
    onAddRow: () => void;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
  }