require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/OutfitManage?schema=public',
});

async function main() {
  await client.connect();
  console.log('--- ENUMS EN POSTGRESQL ---');
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log(enums.rows);

  console.log('\n--- TABLA USUARIO COLUMNAS ---');
  const cols = await client.query(`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'usuario';
  `);
  console.log(cols.rows);

  console.log('\n--- USUARIOS ACTUALES ---');
  const users = await client.query(`SELECT id, nombre, email, password_hash, rol, activo FROM usuario;`);
  console.log(users.rows);
}

main()
  .catch(console.error)
  .finally(() => client.end());
