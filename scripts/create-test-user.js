const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: { 
        hashedPassword,
        name: 'Test User'
      },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        hashedPassword,
      }
    });
    
    console.log('Test user created/updated:', user);
    
    // Create admin user too
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { 
        hashedPassword: adminHashedPassword,
        name: 'Admin User'
      },
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        hashedPassword: adminHashedPassword,
      }
    });
    
    console.log('Admin user created/updated:', adminUser);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating test user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestUser();
