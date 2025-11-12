import mongoose from "mongoose";

// Menggunakan URL dari file config Anda
const url = global.url_mongodb || 'mongodb+srv://kobadev:FirmanID123@apkprem.1fwusjk.mongodb.net/?appName=apkprem';

// Koneksi MongoDB hanya sekali
let isConnected = false;

export async function connectDB() {
  if (isConnected) return mongoose.connection;
  try {
    await mongoose.connect(url, { dbName: 'test' });
    await startInit()
    console.log("✅ Berhasil connect ke MongoDB.");
    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    console.error("❌ Gagal connect ke MongoDB:", err);
    throw err;
  }
}

// ----------------- Schema & Model -----------------
const transactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  botId: { type: Number, required: true, index: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  status: { type: String, default: "completed" },
  accounts: { type: [String], default: [] },
  totalAmount: { type: Number, required: true },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, default: "No Name" },
  role: { type: String, default: "member" },
  balance: { type: Number, default: 0 },
  transaksi: { type: Number, default: 0 },
  membeli: { type: Number, default: 0 },
  total_nominal_transaksi: { type: Number, default: 0 }, 
  banned: { type: Boolean, default: false },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: String, required: true },
  price: { type: Number, required: true },
  desc: { type: String, default: "" },
  snk: { type: String, default: "" },
  terjual: { type: Number, default: 0 },
  account: { type: [String], default: [] }
}, { _id: false });

const productViewSchema = new mongoose.Schema({
  id: { type: [String], default: [] }
})

const botSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  terjual: { type: Number, default: 0 },
  transaksi: { type: Number, default: 0 },
  soldtoday: { type: Number, default: 0 },
  trxtoday: { type: Number, default: 0 },
  total_nominal_transaksi: { type: Number, default: 0 },
  nominaltoday: { type: Number, default: 0 }, 
  product: {
    type: Map,
    of: productSchema,
    default: {}
  },
  product_view: {
    type: Map,
    of: productViewSchema,
    default: {}
  }
}, { timestamps: true });


export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Bot = mongoose.models.Bot || mongoose.model("Bot", botSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);


export async function startInit() {
  await User.init();
  await Bot.init();
  await Transaction.init();
}

// ----------------- Fungsi CRUD User -----------------
export async function userRegister(id, name) {
  await connectDB();
  try {
    const exist = await User.findOne({ id });
    if (exist) return { success: false, error: "ID sudah digunakan." };

    const create = await User.create({ id, name });
    return { success: true, data: create };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editBalance(id, amount) {
  await connectDB();
  try {
    if (!id || amount == null) throw new Error("Masukan data id dan amount!");
    if (isNaN(amount)) throw new Error("Nominal harus berupa angka!");

    const update = await User.findOneAndUpdate(
      { id },
      { $inc: { balance: amount } },
      { new: true }
    );

    if (!update) return { success: false, error: "ID tidak ditemukan." };
    return { success: true, data: update };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editRole(id, role) {
  await connectDB();
  try {
    if (!id || !role) throw new Error("Masukan data id dan role!");

    const update = await User.findOneAndUpdate(
      { id },
      { $set: { role } },
      { new: true }
    );

    if (!update) return { success: false, error: "ID tidak ditemukan." };
    return { success: true, data: update };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteUser(id) {
  await connectDB();
  try {
    const exist = await User.findOne({ id });
    if (!exist) return { success: false, error: "ID tidak ditemukan." };

    await User.deleteOne({ id });
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function checkUser(id) {
  await connectDB();
  try {
    const exist = await User.findOne({ id });
    return { success: true, data: !!exist };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function dbUser(id) {
  await connectDB();
  try {
    const exist = await User.findOne({ id });
    return { success: true, data: exist };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ----------------- Fungsi CRUD Bot -----------------
export async function checkDbBot(id) {
  await connectDB();
  try {
    const exist = await Bot.findOne({ id });
    return { success: true, data: !!exist };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function createDbBot(id, name) {
  await connectDB();
  try {
    const exist = await Bot.findOne({ id });
    if (exist) return { success: false, error: "ID bot sudah terdaftar." };

    const create = await Bot.create({ id, name });
    return { success: true, data: create };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function dbBot(id) {
  await connectDB()
  try {
    const cek = await Bot.findOne({ id })
    return { success: true, data: cek }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

// ----------------- Fungsi CRUD Stok -----------------
export async function createProductView(botId, title) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    if (bot.product_view.has(title)) return { exist: true }
    
    bot.product_view.set(title, { id: [] })
    
    bot.markModified('product_view');
    await bot.save();
    return { success: true, data: bot.product_view.get(title) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function addProductView(botId, title, accounts = []) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const productView = bot.product_view.get(title);
    if (!productView) return { success: false, error: "Title tidak ditemukan di product_view." };

    productView.id.push(...accounts);
    bot.product_view.set(title, productView);

    bot.markModified('product_view');
    await bot.save();

    return { success: true, data: productView };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getProductDetails(botId, productId) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
export async function addProduct(botId, { id, name, price, desc }) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    if (bot.product.has(id)) return { exist: true }

    bot.product.set(id, { id, name, price, desc, account: [] });

    bot.markModified('product');
    await bot.save();

    return { success: true, data: bot.product.get(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


export async function addStock(botId, productId, accounts = []) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    product.account.push(...accounts);
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function delProduct(botId, productId) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    if (!bot.product.has(productId))
      return { success: false, error: "Produk tidak ditemukan." };

    bot.product.delete(productId);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: `Produk ${productId} berhasil dihapus.` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editProductName(botId, productId, newName) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    product.name = newName;
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editProductPrice(botId, productId, newPrice) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    product.price = Number(newPrice);
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editProductDesk(botId, productId, newDesc) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    product.desc = newDesc;
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editProductSnk(botId, productId, newSnk) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    product.snk = newSnk;
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function editProductID(botId, oldId, newId) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(oldId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };
    if (bot.product.has(newId))
      return { success: false, error: "ID baru sudah digunakan." };

    product.id = newId;
    bot.product.delete(oldId);
    bot.product.set(newId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: product };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getProductAccount(botId, productId, total = 1) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };

    const slice = product.account.slice(0, total);
    return { success: true, data: slice };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getProductList(botId) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };

    const list = Array.from(bot.product.values()).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      desc: p.desc,
      snk: p.snk,
      stock: p.account.length,
      terjual: p.terjual
    }));

    return { success: true, data: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


export async function takeProductAccount(botId, productId, total = 1) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };
    const product = bot.product.get(productId);
    if (!product) return { success: false, error: "Produk tidak ditemukan." };
    if (product.account.length < total)
      return { success: false, error: "Stok tidak mencukupi." };

    const takenAccounts = product.account.slice(0, total);
    product.account.splice(0, total);
    bot.product.set(productId, product);

    bot.markModified('product');
    await bot.save();

    return { success: true, data: takenAccounts };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


// ----------------- Fungsi untuk mengambil daftar ketegori
export async function getCategory(botId) {
  await connectDB();
  try {
    const bot = await Bot.findOne({ id: botId });
    if (!bot) return { success: false, error: "Bot tidak ditemukan." };
    const category = bot.product_view
    let data = {}
    for (let [key, id] of category) {
      data[key] = id.id
    }
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


// ----------------- Fungsi untuk mempermudah developer:)
export async function getDBData(fn, ...args) {
  try {
    const result = await fn(...args)
    if (!result.success) throw new Error(result.message)
    return result.data
  } catch (e) {
    console.error('Error database :\n' + e)
    return null
  }
}

// untuk mencatat transaksi
export async function recordSale(botId, productCode, quantity, finalPrice) {
  try {
    const { data: botData } = await dbBot(botId);
    if (!botData)
      throw new Error(
        "Data bot tidak ditemukan untuk pembaruan statistik."
      );

    const product = botData.product.get(productCode);
    if (product) {
      product.sold = (product.sold || 0) + quantity;
      botData.product.set(productCode, product);
      
      botData.markModified('product');
    }

    botData.terjual = (botData.terjual || 0) + quantity;
    botData.soldtoday = (botData.soldtoday || 0) + quantity;
    botData.trxtoday = (botData.trxtoday || 0) + finalPrice;

    await botData.save();
  } catch (dbError) {
    console.error("Gagal memperbarui statistik penjualan:", dbError);
  }
}

export async function addTransactionHistory(userId, botId, productId, productName, quantity, price, accounts = [], status = "completed") {
  await connectDB();
  try {
    const totalAmount = price * quantity;

    const newTransaction = await Transaction.create({
      userId,
      botId,
      productId,
      productName,
      quantity,
      price,
      status,
      accounts,
      totalAmount,
    });

    return { success: true, data: newTransaction };
  } catch (err) {
    console.error("❌ Gagal mencatat riwayat transaksi:", err);
    return { success: false, error: err.message };
  }
}

export async function getUserTransactionHistory(userId, limit = 10, skip = 0) {
  await connectDB();
  try {
    const history = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return { success: true, data: history };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getBotGlobalTransactionHistory(botId, limit = 10, skip = 0) {
  await connectDB();
  try {
    const history = await Transaction.find({ botId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return { success: true, data: history };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function addBotTransaction(botId, totalTransaksi, totalTerjual, totalSoldToday, totalTrxToday, nominalLifetime, nominalToday) {
  await connectDB();
  try {
    const update = await Bot.findOneAndUpdate(
      { id: botId },
      {
        $inc: {
          transaksi: totalTransaksi,
          terjual: totalTerjual,
          soldtoday: totalSoldToday,
          trxtoday: totalTrxToday,
          total_nominal_transaksi: nominalLifetime,
          nominaltoday: nominalToday, 
        },
      },
      { new: true }
    );

    if (!update) return { success: false, error: "ID Bot tidak ditemukan." };
    return { success: true, data: update };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function addUserTransaction(userId, totalTransaksi, totalMembeli, nominal) {
  await connectDB();
  try {
    const update = await User.findOneAndUpdate(
      { id: userId },
      {
        $inc: {
          transaksi: totalTransaksi,
          membeli: totalMembeli,
          total_nominal_transaksi: nominal, 
        },
      },
      { new: true }
    );

    if (!update) return { success: false, error: "ID User tidak ditemukan." };
    return { success: true, data: update };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function addProductSold(botId, productId, totalTerjual) {
  await connectDB();
  try {
    const update = await Bot.findOneAndUpdate(
      { id: botId, [`product.${productId}`]: { $exists: true } },
      {
        $inc: {
          [`product.${productId}.terjual`]: totalTerjual,
        },
      },
      { new: true }
    );

    if (!update) return { success: false, error: "Bot atau Produk tidak ditemukan.", message: update};

    const updatedProduct = update.product.get(productId);
    return { success: true, data: updatedProduct };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ----------------- Fungsi Reset Harian Bot -----------------
export async function resetBotDailyStats() {
  await connectDB();
  try {
    const result = await Bot.updateMany(
      {},
      { 
        $set: {
          soldtoday: 0,
          trxtoday: 0,
          nominaltoday: 0,
        }
      }
    );
    console.log(`✅ Berhasil mereset statistik harian untuk ${result.modifiedCount} bot.`);
    return { success: true, data: result };
  } catch (err) {
    console.error("❌ Gagal mereset statistik harian bot:", err);
    return { success: false, error: err.message };
  }
}