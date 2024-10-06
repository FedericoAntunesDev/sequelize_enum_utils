export const commonQueries = {
  selectEnumColumnDetailsQuery: (enumName: string) =>
    `
    SELECT c.table_schema, c.table_name, c.column_name, c.column_default 
    FROM information_schema.columns c JOIN pg_type t ON t.typname = c.udt_name 
    WHERE t.typname = '${enumName}';
    `,

  selectEnumData: (enumName: string) =>
    `
    SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = '${enumName}';
    `,

  createEnum: (enumName: string, enumMembersFormatted: string) =>
    `
    CREATE TYPE ${enumName} AS ENUM (${enumMembersFormatted});
    `,

  createTemporalTextColumn: (tableName: string, columnName: string) =>
    `
    ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT NULL;
    `,

  populateTemporalTextColumn: (tableName: string, columnName: string, tempColumnName: string) =>
    `
    UPDATE ${tableName} SET ${tempColumnName} = ${columnName};
    `,

  createEnumColumn: (tableName: string, columnName: string, enumName: string) =>
    `
    ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${enumName} NULL;
    `,

  populateEnumColumn: (
    tableName: string,
    newColumnName: string,
    tempColumnName: string,
    supportedValues: string,
    enumName: string,
  ) =>
    `
    UPDATE ${tableName} SET ${newColumnName} = CASE WHEN ${tempColumnName} IN (${supportedValues}) 
    THEN ${tempColumnName}::${enumName} 
    ELSE NULL END;
    `,

  populateDefaultValue: (tableName: string, newColumnName: string, defaultEnumValue: string) =>
    `
    UPDATE ${tableName}
    SET ${newColumnName} = '${defaultEnumValue}'
    WHERE ${newColumnName} IS NULL;
  `,
};
