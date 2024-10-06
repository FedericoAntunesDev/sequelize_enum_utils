import { QueryInterface } from 'sequelize';

type BaseParams = {
  queryInterface: QueryInterface;
};

export type RemoveMemberParams = BaseParams & {
  enumName: string;
  enumMembersToRemove: string[];
  defaultEnumValue?: string;
};
