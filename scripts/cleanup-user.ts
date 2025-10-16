/**
 * Script to clean up old user accounts from NextAuth migration
 * Run with: npx tsx scripts/cleanup-user.ts <email>
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: npx tsx scripts/cleanup-user.ts <email>");
  process.exit(1);
}

async function cleanupUser() {
  try {
    console.log(`🔍 Looking for user: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        sessions: true,
        invoices: {
          select: { id: true, invoiceNumber: true }
        }
      }
    });

    if (!user) {
      console.log("✅ No user found with that email - you can create a new account!");
      process.exit(0);
    }

    console.log("\n📊 Found user:");
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Name: ${user.name || 'Not set'}`);
    console.log(`  - Accounts: ${user.accounts.length}`);
    console.log(`  - Sessions: ${user.sessions.length}`);
    console.log(`  - Invoices: ${user.invoices.length}`);

    if (user.invoices.length > 0) {
      console.log("\n⚠️  WARNING: This user has invoices:");
      user.invoices.forEach(inv => {
        console.log(`    - ${inv.invoiceNumber}`);
      });
      console.log("\n❌ Cannot delete user with existing invoices!");
      console.log("   Sign up with a different email, or manually migrate the data.");
      process.exit(1);
    }

    console.log("\n🗑️  Deleting user (has no invoices)...");
    
    // Delete sessions first
    await prisma.session.deleteMany({ where: { userId: user.id } });
    console.log("  ✓ Deleted sessions");
    
    // Delete accounts
    await prisma.account.deleteMany({ where: { userId: user.id } });
    console.log("  ✓ Deleted accounts");
    
    // Delete user
    await prisma.user.delete({ where: { id: user.id } });
    console.log("  ✓ Deleted user");

    console.log("\n✅ User cleaned up! You can now sign up with this email.");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUser();

