import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors'; 

// Impor dari file 'jembatan' mongodb.js
import {
    connectDB,
    AuthUser,         // Skema login web
    User,             // Skema user asli Anda (untuk saldo/stats)
    userRegister,     // Fungsi register asli Anda
    editBalance,      // Fungsi edit balance asli Anda
    dbUser,           // Fungsi get user asli Anda
    getProductList,
    getProductDetails,
    getCategory,      // Impor baru
    getUserTransactionHistory, // Impor baru
    takeProductAccount,
    addTransactionHistory,
    addUserTransaction,
    addProductSold,
    WEB_BOT_ID        // ID Bot yang akan digunakan
} from './mongodb.js';

// --- Konfigurasi Server ---
const app = express();
const PORT = process.env.PORT || 22230;
const JWT_SECRET = 'GANTI_DENGAN_KATA_SANDI_RAHASIA_ANDA_YANG_KUAT';
const QRIS_API_URL = 'https://api-qris-simulasi.com/create'; // Ganti dengan API QRIS asli

// --- Koneksi Database ---
connectDB();

// --- Middleware ---
app.use(cors({
    origin: true, // Izinkan semua origin untuk kemudahan
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('./')); // Melayani file statis (index.html, style.css, script.js)

// Middleware Otentikasi (Protect)
const protect = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Tidak terautentikasi. Silakan login.' });
    }
    try {
        // Verifikasi token untuk mendapatkan 'telegramId'
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Menambahkan { telegramId, name } ke request
        next();
    } catch (err) {
        res.clearCookie('token'); // Hapus token yang tidak valid
        return res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
    }
};

// --- Fungsi Utility ---
const rupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};
const createReffIdd = () => {
    return `WEB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
};

// --- Rute API Otentikasi & User ---

// Rute Pendaftaran (Diperbarui)
app.post('/api/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Nama, username, email, dan password harus diisi.' });
        }
        
        const existingAuthUser = await AuthUser.findOne({ $or: [{ email }, { username }] });
        if (existingAuthUser) {
            return res.status(400).json({ success: false, message: 'Email atau Username sudah terdaftar.' });
        }

        // 1. Buat ID unik (Number) untuk skema User asli Anda
        const newTelegramId = Date.now(); // Menggunakan timestamp sebagai ID Number unik

        // 2. Daftarkan ke skema User asli Anda menggunakan fungsi userRegister (hanya butuh ID dan name)
        const userRegResult = await userRegister(newTelegramId, name);
        if (!userRegResult.success) {
            // Jika ID sudah ada (sangat kecil kemungkinannya), kirim error
            return res.status(500).json({ success: false, message: userRegResult.error });
        }
        
        // 3. Buat entri di AuthUser untuk login web (username, email, password)
        const newAuthUser = new AuthUser({ 
            username,
            email, 
            password, // Password akan di-hash oleh pre-save hook di mongodb.js
            telegramId: newTelegramId 
        });
        await newAuthUser.save();

        // Poin 1: Saldo awal dihapus.
        // await editBalance(newTelegramId, 50000); 

        res.status(201).json({ success: true, message: 'Pendaftaran berhasil. Silakan login.' });
    
    } catch (error) {
        console.error('Error saat register:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat pendaftaran.' });
    }
});

// Rute Login (Diperbarui)
app.post('/api/login', async (req, res) => {
    try {
        // Poin 7: Menerima 'loginIdentifier' (bisa username atau email)
        const { loginIdentifier, password } = req.body;
        if (!loginIdentifier || !password) {
            return res.status(400).json({ success: false, message: 'Username/Email dan Password harus diisi.' });
        }

        // 1. Cari user di skema AuthUser berdasarkan email ATAU username
        const authUser = await AuthUser.findOne({ 
            $or: [{ email: loginIdentifier }, { username: loginIdentifier }] 
        });
        
        if (!authUser) {
            return res.status(400).json({ success: false, message: 'Username/Email atau Password salah.' });
        }

        // 2. Bandingkan password
        const isMatch = await authUser.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Username/Email atau Password salah.' });
        }
        
        // 3. Ambil data user lengkap (nama, saldo) dari skema User asli
        const userResult = await dbUser(authUser.telegramId);
        if (!userResult.success || !userResult.data) {
            return res.status(404).json({ success: false, message: 'Data user tidak ditemukan. Hubungi admin.' });
        }
        const user = userResult.data;

        // 4. Buat JWT (Payload berisi telegramId dan nama)
        const tokenPayload = { 
            telegramId: user.id, 
            name: user.name // 'name' dari skema User, bukan username dari AuthUser
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        // 5. Set cookie HTTP-Only
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
        });

        res.json({ success: true, name: user.name, id: user.id, message: 'Login berhasil.' });
    
    } catch (error) {
        console.error('Error saat login:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat login.' });
    }
});

// Rute Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout berhasil.' });
});

// Rute Cek User (untuk memeriksa cookie saat memuat halaman)
app.get('/api/user', protect, async (req, res) => {
    try {
        // req.user.telegramId didapat dari middleware 'protect'
        const userResult = await dbUser(req.user.telegramId); 
        
        if (!userResult.success || !userResult.data) {
             return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }
        
        const user = userResult.data;
        res.json({ 
            success: true, 
            data: {
                name: user.name,
                balance: user.balance,
                id: user.id
            }
        });
    } catch (error) {
        console.error('Error saat mengambil data user:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});


// --- Rute API Produk & Kategori ---

// Rute Daftar Kategori (BARU - Poin 2)
app.get('/api/categories', async (req, res) => {
    try {
        const result = await getCategory(WEB_BOT_ID);
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
             res.status(500).json({ success: false, message: result.error || 'Gagal mengambil kategori.' });
        }
    } catch (error) {
         console.error('Error saat mengambil kategori:', error);
         res.status(500).json({ success: false, message: 'Gagal mengambil kategori.' });
    }
});

// Rute Daftar Produk (Tidak berubah, tetap ambil semua)
app.get('/api/products', async (req, res) => {
    try {
        // Menggunakan ID Bot statis dan fungsi getProductList Anda
        const result = await getProductList(WEB_BOT_ID); 
        
        if (result.success) {
            // Fungsi getProductList Anda sudah menghitung 'stock', jadi data siap pakai
            res.json({ success: true, data: result.data });
        } else {
            res.status(500).json({ success: false, message: result.error || 'Gagal mengambil daftar produk.' });
        }
    } catch (error) {
        console.error('Error saat mengambil produk:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar produk.' });
    }
});

// Rute Detail Produk (Menggunakan getProductDetails)
app.get('/api/products/:id', async (req, res) => {
    try {
        const result = await getProductDetails(WEB_BOT_ID, req.params.id);

        if (result.success) {
            // Buat salinan data untuk dikirim ke frontend
            const productData = { ...result.data.toObject() };
            
            // Hitung stok berdasarkan array 'account'
            productData.stock = productData.account ? productData.account.length : 0;
            
            // HAPUS array 'account' dari data yang dikirim ke frontend (Keamanan)
            delete productData.account; 
            
            res.json({ success: true, data: productData });
        } else {
            res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
    } catch (error) {
        console.error('Error saat mengambil detail produk:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.' });
    }
});


// --- Rute API Profil (BARU - Poin 6) ---

// Rute ambil data profile
app.get('/api/profile', protect, async (req, res) => {
    try {
        const authUser = await AuthUser.findOne({ telegramId: req.user.telegramId }).select('email username');
        const userResult = await dbUser(req.user.telegramId);
        
        if (!authUser || !userResult.success || !userResult.data) {
            return res.status(404).json({ success: false, message: 'Data pengguna tidak ditemukan.' });
        }
        
        res.json({
            success: true,
            data: {
                name: userResult.data.name,
                email: authUser.email,
                username: authUser.username
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// Rute ambil riwayat transaksi
app.get('/api/profile/transactions', protect, async (req, res) => {
    try {
        const historyResult = await getUserTransactionHistory(req.user.telegramId, 20, 0); // Ambil 20 transaksi terakhir
        if (!historyResult.success) {
            return res.status(500).json({ success: false, message: historyResult.error });
        }
        res.json({ success: true, data: historyResult.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// Rute ubah password
app.post('/api/profile/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Semua field harus diisi.' });
        }

        const authUser = await AuthUser.findOne({ telegramId: req.user.telegramId });
        const isMatch = await authUser.comparePassword(currentPassword);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Password saat ini salah.' });
        }
        
        authUser.password = newPassword; // Pre-save hook akan hash otomatis
        await authUser.save();
        
        res.json({ success: true, message: 'Password berhasil diubah.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

// Rute ubah email
app.post('/api/profile/change-email', protect, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        if (!newEmail || !password) {
            return res.status(400).json({ success: false, message: 'Semua field harus diisi.' });
        }

        const authUser = await AuthUser.findOne({ telegramId: req.user.telegramId });
        const isMatch = await authUser.comparePassword(password);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Password salah.' });
        }
        
        const emailExists = await AuthUser.findOne({ email: newEmail });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'Email baru sudah digunakan.' });
        }

        authUser.email = newEmail;
        await authUser.save();
        
        res.json({ success: true, message: 'Email berhasil diubah.' });

    } catch (error) {
        if (error.code === 11000) {
             return res.status(400).json({ success: false, message: 'Email tersebut sudah digunakan.' });
        }
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});


// --- Rute API Pemesanan ---

// Rute Order via Saldo (Menggunakan fungsi-fungsi database Anda)
app.post('/api/order/saldo', protect, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const telegramId = req.user.telegramId; // ID User dari JWT (Number)

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Data pesanan tidak valid.' });
        }

        // 1. Cek User, Saldo, dan Produk
        const userResult = await dbUser(telegramId);
        const productResult = await getProductDetails(WEB_BOT_ID, productId);
        
        if (!userResult.success || !userResult.data) throw new Error('Data User tidak ditemukan.');
        if (!productResult.success || !productResult.data) throw new Error('Produk tidak ditemukan.');

        const user = userResult.data;
        const product = productResult.data;
        const currentStock = product.account.length;
        const totalCost = product.price * quantity;

        if (currentStock < quantity) throw new Error('Stok tidak mencukupi.');
        if (user.balance < totalCost) throw new Error('Saldo Anda tidak mencukupi.');

        // 2. Kurangi Saldo User (Menggunakan fungsi editBalance Anda)
        const balanceUpdateResult = await editBalance(telegramId, -totalCost);
        if (!balanceUpdateResult.success) {
            throw new Error('Gagal memproses saldo. Coba lagi.');
        }

        // 3. Ambil Stok Produk (Menggunakan fungsi takeProductAccount Anda)
        const accountsResult = await takeProductAccount(WEB_BOT_ID, productId, quantity);

        if (!accountsResult.success) {
            // JIKA GAGAL AMBIL STOK, KEMBALIKAN SALDO (ROLLBACK)
            await editBalance(telegramId, totalCost);
            throw new Error(accountsResult.error || 'Gagal mengambil stok produk. Saldo telah dikembalikan.');
        }

        const takenAccounts = accountsResult.data;
        
        // 4. Update Statistik (Menggunakan fungsi Anda)
        const reffId = createReffIdd();
        await addUserTransaction(telegramId, 1, quantity, totalCost);
        await addProductSold(WEB_BOT_ID, productId, quantity); 
        await addTransactionHistory(
            telegramId,
            WEB_BOT_ID,
            productId,
            product.name,
            quantity,
            product.price,
            takenAccounts
        );
        // (Anda bisa tambahkan addBotTransaction di sini jika perlu)
        
        res.json({ 
            success: true, 
            message: 'Pemesanan via Saldo berhasil!', 
            data: { 
                reffId, 
                totalCost: rupiah(totalCost), 
                accounts: takenAccounts 
            } 
        });

    } catch (error) {
        console.error('Error saat order saldo:', error.message);
        // Mengirim pesan error yang aman ke pengguna
        res.status(400).json({ success: false, message: error.message || 'Terjadi kesalahan saat pemesanan.' });
    }
});

// Rute Order via QRIS (Hanya simulasi pembuatan QR)
app.post('/api/order/qris', protect, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        const productResult = await getProductDetails(WEB_BOT_ID, productId);
        if (!productResult.success || !productResult.data) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
        
        const product = productResult.data;
        if (product.account.length < quantity) {
            return res.status(400).json({ success: false, message: 'Stok tidak mencukupi.' });
        }

        const totalCost = product.price * quantity;
        const reffId = createReffIdd();

        // --- SIMULASI PANGGILAN API QRIS/TOKOPAY ---
        // Ganti bagian ini dengan panggilan API Tokopay Anda yang sebenarnya
        // const qrisResponse = await axios.get(`https://api.tokopay.id/v1/order?merchant=...&secret=...&ref_id=${reffId}&nominal=${totalCost}&metode=QRISREALTIME`);
        // const qrLink = qrisResponse.data.data.qr_link;

        // Menggunakan placeholder simulasi
        const mockQrLink = `https://placehold.co/250x250/000/FFF/png?text=SCAN+QRIS%0A${reffId}%0A${rupiah(totalCost)}`;

        res.json({ 
            success: true, 
            message: 'QRIS dibuat, segera lakukan pembayaran.',
            data: {
                reffId,
                totalCost: rupiah(totalCost),
                qrLink: mockQrLink, // Ganti dengan qrLink asli
            }
        });
        
        // CATATAN: Untuk implementasi QRIS nyata, Anda perlu endpoint webhook
        // yang akan dipanggil Tokopay setelah pembayaran berhasil.
        // Webhook tersebut yang akan memanggil takeProductAccount dan update statistik.

    } catch (error) {
        console.error('Error saat membuat QRIS:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat membuat QRIS.' });
    }
});

// Rute Index (halaman utama)
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './' });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});