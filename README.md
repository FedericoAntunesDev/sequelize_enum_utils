# ENUM utils Sequelize PostgreSQL

This package provides utilities for easier manipulation of **PostgreSQL** ENUMs in **Sequelize** migrations.

## Install

```
npm install sequelize_enum_utils
```

## How to use

In this migration we are removing the `PENDING` value from the `enum_transaction_status` and specify the default value `ACCEPTED`, this will affect all the columns and tables that are currently using the provided enum:

```js
'use strict';

const { enumUtils } = require('sequelize_enum_utils');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await enumUtils.removeMember({
      queryInterface,
      enumName: 'enum_transaction_status',
      enumMembersToRemove: ['PENDING'],
      defaultEnumValue: 'ACCEPTED',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes
  },
};
```

### removeMember

Params:

```js
  {
  queryInterface: QueryInterface;
  enumName: string;
  enumMembersToRemove: string[];
  defaultEnumValue: string; //Optional
  }
```

If no `defaultEnumValue` is provided, the affected columns will be set to `null`

In version `1.0.0`, only the `removeMember` method is available.

## Maintainers

- **[Federico Antunes](https://github.com/FedericoAntunesDev)**
