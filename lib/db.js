import mysql from 'mysql2/promise';

// One shared pool. In dev, Next.js hot-reloads modules, so we cache it on globalThis.
const globalForDb = globalThis;

function createPool() {
  for (const key of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE']) {
    if (!process.env[key]) throw new Error(`Missing environment variable ${key}`);
  }
  return mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 10,
    decimalNumbers: true,
    dateStrings: true,
    namedPlaceholders: false,
  });
}

export function getPool() {
  if (!globalForDb._gridPool) globalForDb._gridPool = createPool();
  return globalForDb._gridPool;
}

/** Parameterised query - values are never concatenated into SQL. */
export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

/** Run several statements on one connection (needed for CALL ... OUT @var; SELECT @var). */
export async function withConnection(fn) {
  const conn = await getPool().getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}
