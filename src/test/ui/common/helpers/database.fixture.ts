import { test as base } from '@playwright/test';
import { Client } from 'pg';

import config from '../../../test-config';

const dbconfig = config.db;

type DBHelpers = {
  fetchTable: (tableName: string) => Promise<Record<string, unknown>[]>;
  executeQuery: (query: string) => Promise<Record<string, unknown>[]>;
  fetchColumnsFromTable: (tableName: string, columns: string[]) => Promise<Record<string, unknown>[]>;
  fetchRowFromTableOnCondition: (
    tableName: string,
    columnName: string,
    columnValue: string
  ) => Promise<Record<string, unknown>[]>;
  fetchFieldValue: (
    tableName: string,
    columnName: string,
    fieldName: string,
    columnValue: string
  ) => Promise<Record<string, unknown>[]>;
};

export const test = base.extend<{ connectDB: DBHelpers }>({
  connectDB: async (_, use) => {
    const client = new Client({
      host: dbconfig.host,
      port: dbconfig.port ? Number(dbconfig.port) : undefined,
      database: dbconfig.database,
      user: dbconfig.user,
      password: dbconfig.password,
      ssl: dbconfig.ssl,
    });
    await client.connect();

    const helpers: DBHelpers = {
      async fetchTable(tableName) {
        const result = await client.query(`SELECT * FROM public.${tableName}`);
        return result.rows;
      },
      async executeQuery(query) {
        const result = await client.query(query);
        return result.rows;
      },
      async fetchColumnsFromTable(tableName, columns) {
        const result = await client.query(`SELECT ${columns} FROM public.${tableName}`);
        return result.rows;
      },
      async fetchRowFromTableOnCondition(tableName, columnName, columnValue) {
        const result = await client.query(`SELECT * FROM public.${tableName} WHERE ${columnName} = '${columnValue}'`);
        return result.rows;
      },
      async fetchFieldValue(tableName, fieldName, columnName, columnValue) {
        const result = await client.query(
          `SELECT ${fieldName} FROM public.${tableName} WHERE ${columnName} = '${columnValue}'`
        );
        return result.rows;
      },
    };

    await use(helpers);
    await client.end();
  },
});
