export type GetEnumColumnDetailsQuery = {
  table_schema: string;
  table_name: string;
  column_name: string;
  column_default: string;
};

export type GetEnumData = {
  enumlabel: string;
};
