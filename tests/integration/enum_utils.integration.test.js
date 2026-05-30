const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { after, before, beforeEach, test } = require('node:test');
const { Sequelize } = require('sequelize');
const { addMember, removeMember } = require('../../dist/methods');

const execFileAsync = promisify(execFile);

const POSTGRES_IMAGE = process.env.TEST_POSTGRES_IMAGE || 'postgres:16-alpine';
const DB_NAME = 'enum_utils_test';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';

let containerName = null;
let sequelize = null;
let queryInterface = null;

async function dockerCommand(args) {
  const { stdout } = await execFileAsync('docker', args, { encoding: 'utf8' });
  return stdout.trim();
}

async function startPostgresContainer() {
  containerName = `sequelize-enum-utils-test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  await dockerCommand([
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '-e',
    `POSTGRES_DB=${DB_NAME}`,
    '-e',
    `POSTGRES_USER=${DB_USER}`,
    '-e',
    `POSTGRES_PASSWORD=${DB_PASSWORD}`,
    '-p',
    '127.0.0.1::5432',
    POSTGRES_IMAGE,
  ]);

  const portOutput = await dockerCommand(['port', containerName, '5432/tcp']);
  const portMatch = portOutput.match(/:(\d+)\s*$/m);

  if (!portMatch) {
    throw new Error(`Could not read mapped postgres port from: ${portOutput}`);
  }

  return Number(portMatch[1]);
}

async function stopPostgresContainer() {
  if (!containerName) {
    return;
  }

  try {
    await dockerCommand(['rm', '--force', containerName]);
  } catch {
    // No-op. We always try to clean up, even if container is already gone.
  }

  containerName = null;
}

async function waitForDatabaseReady(instance) {
  let lastError;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await instance.authenticate();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(
    `PostgreSQL did not become ready after 30 seconds. Last error: ${String(lastError)}`,
  );
}

async function resetPublicSchema() {
  await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await sequelize.query('CREATE SCHEMA public;');
}

async function createFixture(enumName) {
  await sequelize.query(`CREATE TYPE ${enumName} AS ENUM ('PENDING', 'APPROVED', 'REJECTED');`);

  await sequelize.query(`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      status ${enumName} NOT NULL DEFAULT 'PENDING'
    );
  `);

  await sequelize.query(`
    CREATE TABLE shipments (
      id SERIAL PRIMARY KEY,
      status ${enumName} NULL
    );
  `);
}

async function seedFixtureData() {
  await sequelize.query(`
    INSERT INTO orders (status)
    VALUES ('PENDING'), ('APPROVED'), ('REJECTED');
  `);

  await sequelize.query(`
    INSERT INTO shipments (status)
    VALUES ('PENDING'), ('APPROVED'), (NULL);
  `);
}

async function getEnumValues(enumName) {
  const [rows] = await sequelize.query(`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = '${enumName}'
    ORDER BY e.enumsortorder;
  `);

  return rows.map((row) => row.enumlabel);
}

before(
  async () => {
    const port = await startPostgresContainer();
    const connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}`;

    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      logging: false,
    });

    await waitForDatabaseReady(sequelize);
    queryInterface = sequelize.getQueryInterface();
  },
  { timeout: 120000 },
);

after(
  async () => {
    if (sequelize) {
      await sequelize.close();
    }

    await stopPostgresContainer();
  },
  { timeout: 120000 },
);

beforeEach(async () => {
  await resetPublicSchema();
});

test(
  'addMember adds a new value to the enum',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);

    await addMember({
      queryInterface,
      enumName,
      newEnumMember: 'CANCELLED',
    });

    const enumValues = await getEnumValues(enumName);
    assert.deepEqual(enumValues, ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
  },
  { timeout: 30000 },
);

test(
  'addMember fails when the value already exists',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);

    await assert.rejects(
      () =>
        addMember({
          queryInterface,
          enumName,
          newEnumMember: 'PENDING',
        }),
      /already exists/,
    );
  },
  { timeout: 30000 },
);

test(
  'removeMember delete members and applies default',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);
    await seedFixtureData();

    await removeMember({
      queryInterface,
      enumName,
      enumMembersToRemove: ['PENDING'],
      defaultEnumValue: 'APPROVED',
    });

    const enumValues = await getEnumValues(enumName);
    assert.deepEqual(enumValues, ['APPROVED', 'REJECTED']);

    const [orders] = await sequelize.query('SELECT status FROM orders ORDER BY id;');
    assert.deepEqual(
      orders.map((row) => row.status),
      ['APPROVED', 'APPROVED', 'REJECTED'],
    );

    const [shipments] = await sequelize.query('SELECT status FROM shipments ORDER BY id;');
    assert.deepEqual(
      shipments.map((row) => row.status),
      ['APPROVED', 'APPROVED', 'APPROVED'],
    );

    const [columnDetails] = await sequelize.query(`
      SELECT table_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('orders', 'shipments')
        AND column_name = 'status'
      ORDER BY table_name;
    `);

    assert.equal(columnDetails.length, 2);
    for (const column of columnDetails) {
      assert.equal(column.is_nullable, 'NO');
      assert.match(String(column.column_default), /APPROVED/);
    }
  },
  { timeout: 30000 },
);

test(
  'removeMember without default turns removed values in null',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);
    await seedFixtureData();

    await removeMember({
      queryInterface,
      enumName,
      enumMembersToRemove: ['PENDING'],
    });

    const enumValues = await getEnumValues(enumName);
    assert.deepEqual(enumValues, ['APPROVED', 'REJECTED']);

    const [orders] = await sequelize.query('SELECT status FROM orders ORDER BY id;');
    assert.deepEqual(
      orders.map((row) => row.status),
      [null, 'APPROVED', 'REJECTED'],
    );

    const [shipments] = await sequelize.query('SELECT status FROM shipments ORDER BY id;');
    assert.deepEqual(
      shipments.map((row) => row.status),
      [null, 'APPROVED', null],
    );
  },
  { timeout: 30000 },
);

test(
  'removeMember fails if defaultEnumValue does not exists in actual enum',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);

    await assert.rejects(
      () =>
        removeMember({
          queryInterface,
          enumName,
          enumMembersToRemove: ['PENDING'],
          defaultEnumValue: 'ARCHIVED',
        }),
      /is not present in the enum/,
    );
  },
  { timeout: 30000 },
);

test(
  'removeMember fails if defaultEnumValue does not exists in final enum',
  async () => {
    const enumName = 'enum_order_status';
    await createFixture(enumName);

    await assert.rejects(
      () =>
        removeMember({
          queryInterface,
          enumName,
          enumMembersToRemove: ['PENDING'],
          defaultEnumValue: 'PENDING',
        }),
      /resulting enum/,
    );
  },
  { timeout: 30000 },
);
