const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname, e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log('--- ENUMS EN POSTGRESQL ---');
  console.log(enums);

  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'usuario';
  `);
  console.log('\n--- TABLA USUARIO COLUMNAS ---');
  console.log(cols);

  const users = await prisma.$queryRawUnsafe(`SELECT id, nombre, email, password_hash, rol::text as rol_text, activo FROM usuario;`);
  console.log('\n--- USUARIOS ACTUALES ---');
  console.log(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
