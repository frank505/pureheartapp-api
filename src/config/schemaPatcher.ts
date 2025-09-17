import sequelize from './database';

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  const r: any = Array.isArray(rows) ? rows[0] : (rows as any);
  return Number(r?.cnt || 0) > 0;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as cnt
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :indexName`,
    { replacements: { table, indexName } }
  );
  const r: any = Array.isArray(rows) ? rows[0] : (rows as any);
  return Number(r?.cnt || 0) > 0;
}

async function addColumn(table: string, definition: string) {
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
}

async function addIndex(table: string, indexName: string, columnsDef: string) {
  await sequelize.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${columnsDef})`);
}

export async function patchSchema(): Promise<void> {
  // device_tokens columns
  const deviceTable = 'device_tokens';
  if (!(await columnExists(deviceTable, 'device_id'))) {
    await addColumn(deviceTable, '`device_id` VARCHAR(255) NULL');
  }
  if (!(await columnExists(deviceTable, 'last_health_check_at'))) {
    await addColumn(deviceTable, '`last_health_check_at` DATETIME NULL');
  }
  if (!(await columnExists(deviceTable, 'last_error_code'))) {
    await addColumn(deviceTable, '`last_error_code` VARCHAR(255) NULL');
  }
  if (!(await columnExists(deviceTable, 'reinstall_detected_at'))) {
    await addColumn(deviceTable, '`reinstall_detected_at` DATETIME NULL');
  }
  if (!(await indexExists(deviceTable, 'device_tokens_device_id'))) {
    await addIndex(deviceTable, 'device_tokens_device_id', '`device_id`');
  }

  // users columns
  const usersTable = 'users';
  if (!(await columnExists(usersTable, 'uninstall_suspected_at'))) {
    await addColumn(usersTable, '`uninstall_suspected_at` DATETIME NULL');
  }
  if (!(await columnExists(usersTable, 'last_reinstall_at'))) {
    await addColumn(usersTable, '`last_reinstall_at` DATETIME NULL');
  }
  if (!(await columnExists(usersTable, 'last_reinstall_device_id'))) {
    await addColumn(usersTable, '`last_reinstall_device_id` VARCHAR(255) NULL');
  }
  if (!(await columnExists(usersTable, 'last_reinstall_platform'))) {
    await addColumn(usersTable, '`last_reinstall_platform` VARCHAR(50) NULL');
  }
}

export default patchSchema;