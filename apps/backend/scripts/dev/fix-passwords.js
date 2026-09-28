const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const vendedorPass = await bcrypt.hash('vendedor123', 10);
  const bodegaPass = await bcrypt.hash('bodega123', 10);

  await prisma.usuario.updateMany({
    where: { email: 'admin@tienda360.com' },
    data: { passwordHash: adminPass },
  });
  console.log('✅ Contraseña de admin@tienda360.com actualizada');

  await prisma.usuario.updateMany({
    where: { email: { in: ['vendedor@tienda360.com', 'vendedor@tienda.com'] } },
    data: { passwordHash: vendedorPass },
  });
  console.log('✅ Contraseña de vendedores actualizada');

  await prisma.usuario.updateMany({
    where: { email: { in: ['bodega@tienda360.com', 'bodega@tienda.com'] } },
    data: { passwordHash: bodegaPass },
  });
  console.log('✅ Contraseña de bodega actualizada');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
