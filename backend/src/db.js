import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

let poolPromise;

const boolFromEnv = (value, fallback) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export function getConfig() {
  return {
    server: process.env.WISHBI_SQL_SERVER,
    port: Number(process.env.WISHBI_SQL_PORT || 1433),
    database: process.env.WISHBI_SQL_DATABASE,
    user: process.env.WISHBI_SQL_USER,
    password: process.env.WISHBI_SQL_PASSWORD,
    options: {
      encrypt: boolFromEnv(process.env.WISHBI_SQL_ENCRYPT, true),
      trustServerCertificate: boolFromEnv(
        process.env.WISHBI_SQL_TRUST_SERVER_CERTIFICATE,
        true,
      ),
    },
    pool: {
      max: 8,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 45000,
    connectionTimeout: 30000,
  };
}

export async function getPool() {
  if (!process.env.WISHBI_SQL_SERVER || !process.env.WISHBI_SQL_DATABASE ||
      !process.env.WISHBI_SQL_USER || !process.env.WISHBI_SQL_PASSWORD) {
    throw new Error("Configure as variaveis WISHBI_SQL_* antes de conectar.");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(getConfig());
  }

  return poolPromise;
}

export async function query(sqlText, inputs = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(inputs).forEach(([name, input]) => {
    if (
      input &&
      typeof input === "object" &&
      "type" in input &&
      "value" in input
    ) {
      request.input(name, input.type, input.value);
      return;
    }

    request.input(name, input);
  });

  const result = await request.query(sqlText);
  return result.recordset;
}

export { sql };
