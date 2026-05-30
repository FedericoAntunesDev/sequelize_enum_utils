import { QueryInterface } from 'sequelize';

type BaseParams = {
  queryInterface: QueryInterface;
};

export type AddMemberParams = BaseParams & {
  enumName: string;
  newEnumMember: string;
};

export type RemoveMemberParams = BaseParams & {
  enumName: string;
  enumMembersToRemove: string[];
  defaultEnumValue?: string;
};
