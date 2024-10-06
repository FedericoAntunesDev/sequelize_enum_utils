import { QueryInterface } from 'sequelize';
import { queries } from '../queries';
import { GetEnumColumnDetailsQuery, GetEnumData } from '../types';

async function getEnumColumnDetails(
  queryInterface: QueryInterface,
  enumName: string,
): Promise<GetEnumColumnDetailsQuery[]> {
  const columnDetails = await queryInterface.sequelize.query(
    queries.common.selectEnumColumnDetailsQuery(enumName),
  );

  return columnDetails[0] as GetEnumColumnDetailsQuery[];
}

async function getEnumData(queryInterface: QueryInterface, enumName: string): Promise<string[]> {
  const rawEnumData = await queryInterface.sequelize.query(queries.common.selectEnumData(enumName));

  const enumData = rawEnumData[0] as GetEnumData[];

  return enumData.map((enumData: GetEnumData) => enumData.enumlabel);
}

async function createEnum(
  queryInterface: QueryInterface,
  enumName: string,
  enumMembersFormatted: string,
): Promise<void> {
  await queryInterface.sequelize.query(queries.common.createEnum(enumName, enumMembersFormatted));
}

async function createTemporalTextColumn(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
): Promise<void> {
  await queryInterface.sequelize.query(queries.common.createTemporalTextColumn(tableName, columnName));
}

async function populateTemporalTextColumn(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  tempColumnName: string,
): Promise<void> {
  await queryInterface.sequelize.query(
    queries.common.populateTemporalTextColumn(tableName, columnName, tempColumnName),
  );
}

async function createEnumColumn(
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  enumName: string,
): Promise<void> {
  await queryInterface.sequelize.query(queries.common.createEnumColumn(tableName, columnName, enumName));
}

async function populateEnumColumn(
  queryInterface: QueryInterface,
  tableName: string,
  newColumnName: string,
  tempColumnName: string,
  supportedValues: string,
  enumName: string,
): Promise<void> {
  await queryInterface.sequelize.query(
    queries.common.populateEnumColumn(tableName, newColumnName, tempColumnName, supportedValues, enumName),
  );
}

async function populateDefaultValue(
  queryInterface: QueryInterface,
  tableName: string,
  newColumnName: string,
  defaultEnumValue: string,
): Promise<void> {
  await queryInterface.sequelize.query(
    queries.common.populateDefaultValue(tableName, newColumnName, defaultEnumValue),
  );
}

export const dbOperations = {
  getEnumColumnDetails,
  getEnumData,
  createEnum,
  createEnumColumn,
  createTemporalTextColumn,
  populateEnumColumn,
  populateTemporalTextColumn,
  populateDefaultValue,
};
