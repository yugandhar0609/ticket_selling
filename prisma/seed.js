const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample events
  const event1 = await prisma.event.create({
    data: {
      name: 'Summer Music Festival 2024',
      totalSeats: 5000,
      seatsSold: 0,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      name: 'Tech Conference 2024',
      totalSeats: 3000,
      seatsSold: 150,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      name: 'Comedy Night Special',
      totalSeats: 1500,
      seatsSold: 45,
    },
  });

  console.log('✅ Created events:', {
    event1: event1.name,
    event2: event2.name,
    event3: event3.name,
  });

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 