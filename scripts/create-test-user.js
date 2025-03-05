const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Generate hashed password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (existingUser) {
      // Update user with password
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { hashedPassword }
      });
      console.log('Updated test user with password:', updatedUser.id);
    } else {
      // Create new test user
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          hashedPassword
        }
      });
      console.log('Created test user:', user.id);
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();