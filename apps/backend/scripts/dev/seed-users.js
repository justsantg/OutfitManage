const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Verificando y sembrando usuarios de prueba...');

  const users = [
    {
      email: 'admin@tienda360.com',
      nombre: 'Administrador Tienda360',
      password: 'admin123',
      rol: 'ADMIN',
    },
    {
      email: 'vendedor@tienda.com',
      nombre: 'Vendedor Punto Físico',
      password: 'vendedor123',
      rol: 'VENDEDOR',
    },
    {
      email: 'bodega@tienda.com',
      nombre: 'Operador de Bodega',
      password: 'bodega123',
      rol: 'BODEGA',
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        rol: u.rol,
        activo: true,
      },
      create: {
        email: u.email,
        nombre: u.nombre,
        passwordHash,
        rol: u.rol,
        activo: true,
      },
    });
    console.log(`✅ Usuario configurado: ${user.email} (Rol: ${user.rol}, Password: ${u.password})`);
  }

  // Listar todos los usuarios actuales
  const allUsers = await prisma.usuario.findMany({
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });
  console.log('\nUsuarios en base de datos:', allUsers);
}

main()
  .catch((e) => console.error('Error sembrando usuarios:', e))
  .finally(async () => {
    await prisma.$disconnect();
  });
