const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Wallet = require("./models/Wallet");
const Transaction = require("./models/Transaction");

dotenv.config();

const APPLY = process.argv.includes("--apply");
const RESET_EARNINGS = !process.argv.includes("--keep-earnings");
const RESET_TRANSACTIONS = process.argv.includes("--reset-transactions");
const PURGE_ADMIN_GRANTS = process.argv.includes("--purge-admin-grants");

const sumField = async (field) => {
  const result = await Wallet.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: `$${field}` },
      },
    },
  ]);
  return result[0]?.total || 0;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const walletsCount = await Wallet.countDocuments();
  const totalBalanceBefore = await sumField("balance");
  const totalEarningsBefore = await sumField("earnings");

  console.log("--- Wallet Snapshot (Before) ---");
  console.log(`wallets: ${walletsCount}`);
  console.log(`total balance: ${totalBalanceBefore}`);
  console.log(`total earnings: ${totalEarningsBefore}`);

  if (!APPLY) {
    console.log("\nDry-run mode. No changes were written.");
    console.log("Run with --apply to execute reset.");
    await mongoose.disconnect();
    return;
  }

  const setFields = RESET_EARNINGS ? { balance: 0, earnings: 0 } : { balance: 0 };
  const walletUpdate = await Wallet.updateMany({}, { $set: setFields });

  console.log("\n--- Applied Wallet Reset ---");
  console.log(`matched wallets: ${walletUpdate.matchedCount}`);
  console.log(`modified wallets: ${walletUpdate.modifiedCount}`);

  if (RESET_TRANSACTIONS) {
    const txUpdate = await Transaction.updateMany(
      {
        type: "purchase",
        status: "pending",
        gateway: { $in: ["manual", "vodafone_cash", "admin"] },
      },
      {
        $set: {
          status: "failed",
          paymentMeta: {
            failureReason: "reset_fake_coins",
            failedAt: new Date(),
          },
        },
      },
    );

    console.log("\n--- Pending Transaction Cleanup ---");
    console.log(`matched transactions: ${txUpdate.matchedCount}`);
    console.log(`modified transactions: ${txUpdate.modifiedCount}`);
  }

  if (PURGE_ADMIN_GRANTS) {
    const txDelete = await Transaction.deleteMany({ type: "admin_grant" });
    console.log("\n--- Admin Grant Cleanup ---");
    console.log(`deleted admin_grant transactions: ${txDelete.deletedCount}`);
  }

  const totalBalanceAfter = await sumField("balance");
  const totalEarningsAfter = await sumField("earnings");

  console.log("\n--- Wallet Snapshot (After) ---");
  console.log(`total balance: ${totalBalanceAfter}`);
  console.log(`total earnings: ${totalEarningsAfter}`);

  await mongoose.disconnect();
  console.log("Done.");
};

run().catch(async (error) => {
  console.error("Reset failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
