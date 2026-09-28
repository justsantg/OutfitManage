const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('cliente123', 10);
  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@tienda360.com' },
    update: {
      rol: 'CLIENTE',
      passwordHash: hashedPassword,
    },
    create: {
      nombre: 'Cliente Tienda',
      email: 'cliente@tienda360.com',
      passwordHash: hashedPassword,
      rol: 'CLIENTE',
      activo: true,
    },
  });

  console.log('✅ Cliente listo en base de datos:', cliente.email, cliente.rol);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
