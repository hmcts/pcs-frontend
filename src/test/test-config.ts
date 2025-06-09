const dbUserName = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;

export default {
  db: {
    host: 'localhost',
    port: dbPort,
    database: dbName,
    user: dbUserName,
    password: dbPassword,
    ssl: {
      rejectUnauthorized: false,
    },
  },
};
