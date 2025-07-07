// in lib/db.ts

import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:3306
};

// --- ADD THIS LINE FOR DEBUGGING ---
console.log('--- DATABASE CONFIG BEING USED ---', dbConfig);
// ------------------------------------

export { mysql };