import { dbOperations } from '../db_operations/db_operations';
import { AddMemberParams } from '../types/common.types';

/**
 * Adds a member to an existing enum in a PostgreSQL database.
 *
 * @param {AddMemberParams} addMemberParams - The parameters for adding a new enum member.
 * @param {QueryInterface} addMemberParams.queryInterface - The Sequelize QueryInterface.
 * @param {string} addMemberParams.enumName - The name of the enum to modify.
 * @param {string} addMemberParams.newEnumMember - The enum member to add.
 * @throws Will throw an error if the enum member already exists.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function addMember(addMemberParams: AddMemberParams) {
  const { queryInterface, enumName, newEnumMember } = addMemberParams;

  const enumData: string[] = await dbOperations.getEnumData(queryInterface, enumName);

  if (enumData.includes(newEnumMember)) {
    throw new Error(`Enum member ${newEnumMember} already exists in enum ${enumName}`);
  }

  await dbOperations.addMember(queryInterface, enumName, newEnumMember);
}
