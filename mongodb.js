import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
// Impor semua fungsi dan model dari file database.js asli Anda
import * as db from './database.js';

// --- ID BOT APLIKASI WEB ---
// Diambil dari file APKPremium/config.js Anda
export const WEB_BOT_ID = 8323651234;

// --- Skema Otentikasi Web ---
// Skema ini HANYA untuk menyimpan email/password login web.
// Skema ini terhubung ke skema 'User' Anda melalui 'telegramId'.
const authUserSchema = new mongoose.Schema({
  // Poin 7: Tambahan username
  username: { type: String, required: true, unique: true, sparse: true }, 
  email: { type: String, required: true, unique: true, sparse: true },
  password: { type: String, required: true },
  // Ini adalah 'id' (Number) dari skema User asli Anda
  telegramId: { type: Number, required: true, unique: true } 
}, { timestamps: true });

// Pre-save hook untuk hash password
authUserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Metode untuk membandingkan password
authUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Model untuk otentikasi web
export const AuthUser = mongoose.models.AuthUser || mongoose.model("AuthUser", authUserSchema);

// --- Ekspor Ulang (Re-export) ---
// Ekspor ulang semua fungsi dan model dari database.js Anda
// agar app.js hanya perlu mengimpor dari file ini.
export const {
    connectDB,
    User,
    Bot,
    Transaction,
    userRegister,
    editBalance,
    editRole,
    deleteUser,
    checkUser,
    dbUser,
    checkDbBot,
    createDbBot,
    dbBot,
    createProductView,
    addProductView,
    getProductDetails,
    addProduct,
    addStock,
    delProduct,
    editProductName,
    editProductPrice,
    editProductDesk,
    editProductSnk,
    editProductID,
    getProductAccount,
    getProductList,
    takeProductAccount,
    getCategory,
    getDBData,
    recordSale,
    addTransactionHistory,
    getUserTransactionHistory, // Diperlukan untuk Poin 6
    getBotGlobalTransactionHistory,
    addBotTransaction,
    addUserTransaction,
    addProductSold,
    resetBotDailyStats
} = db;