import { dbOperations } from '../db_operations/db_operations';
import { GetEnumColumnDetailsQuery } from '../types';
import { RemoveMemberParams } from '../types/common.types';

/**
 * Removes specified members from an enum in a PostgreSQL database.
 *
 * @param {RemoveMemberParams} removeMemberParams - The parameters for removing enum members.
 * @param {QueryInterface} removeMemberParams.queryInterface - The Sequelize QueryInterface.
 * @param {string} removeMemberParams.enumName - The name of the enum to modify.
 * @param {string[]} removeMemberParams.enumMembersToRemove - The members to remove from the enum.
 * @param {string} [removeMemberParams.defaultEnumValue] - The default value to set if a removed member is used.
 * @throws Will throw an error if the default enum value is not present in the enum.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function removeMember(removeMemberParams: RemoveMemberParams) {
  const { queryInterface, enumName, enumMembersToRemove, defaultEnumValue } = removeMemberParams;

  const columnsData: GetEnumColumnDetailsQuery[] = await dbOperations.getEnumColumnDetails(
    queryInterface,
    enumName,
  );

  const enumData: string[] = await dbOperations.getEnumData(queryInterface, enumName);

  if (defaultEnumValue && !enumData.includes(defaultEnumValue)) {
    throw new Error(`Default enum value ${defaultEnumValue} is not present in the enum ${enumName}`);
  }

  const newEnumMembersFormatted: string = enumData
    .filter((enumMember) => !enumMembersToRemove.includes(enumMember))
    .map((value) => `'${value}'`)
    .join(', ');

  // TODO: maybe add some random numbers to avoid conflicts
  const newEnumName = `${enumName}_new`;

  await dbOperations.createEnum(queryInterface, newEnumName, newEnumMembersFormatted);

  for (const columnData of columnsData) {
    const tableName = columnData.table_name;
    const columnName = columnData.column_name;
    const newColumnName = `${columnName}_new`;
    const tempColumnName = `${columnName}_temp`;

    await dbOperations.createTemporalTextColumn(queryInterface, tableName, tempColumnName);

    await dbOperations.populateTemporalTextColumn(queryInterface, tableName, columnName, tempColumnName);

    await dbOperations.createEnumColumn(queryInterface, tableName, newColumnName, newEnumName);

    await dbOperations.populateEnumColumn(
      queryInterface,
      tableName,
      newColumnName,
      tempColumnName,
      newEnumMembersFormatted,
      newEnumName,
    );

    if (defaultEnumValue) {
      await dbOperations.populateDefaultValue(queryInterface, tableName, newColumnName, defaultEnumValue);

      await queryInterface.changeColumn(tableName, newColumnName, {
        type: newEnumName,
        allowNull: false,
        defaultValue: defaultEnumValue,
      });
    }

    await queryInterface.removeColumn(tableName, columnName);

    await queryInterface.renameColumn(tableName, newColumnName, columnName);

    await queryInterface.removeColumn(tableName, tempColumnName);
  }

  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS ${String(enumName)};`);

  await queryInterface.sequelize.query(`ALTER TYPE ${newEnumName} RENAME TO ${String(enumName)}`);
}
