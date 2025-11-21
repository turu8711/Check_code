// .env 読み込み
require('dotenv').config();

const express = require('express');
const path = require('path');
const { generateHTML } = require('./generateHTML');

const app = express();


// ポート番号を.envから読み込み。なければデフォルト値。
const PORT = process.env.PORT || 3000;

//データファイル　デフォルトはなし
const DATA_FILE = process.env.DATA_FILE;
const DATA_DIR = path.join(__dirname, 'Authentication');

// JSONのパース
app.use(express.json());

// dataフォルダを静的配信
app.use('/Authentication', express.static(DATA_DIR));

// 初回起動時にHTMLを生成
generateHTML();

// API: Authentication.jsonに新しいデータを追加
app.post('/api/add', async (req, res) => {
  try {
    const newItem = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.push(newItem);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    await generateHTML(); // 追加後にHTML更新
    res.send({ success: true, message: 'データを追加しました' });
  } catch (err) {
    console.error('❌ データ追加中にエラー:', err);
    res.status(500).send({ success: false, message: '追加エラー' });
  }
});

// QR生成
const ticketFormRouter = require('./form/index.js');
app.use('/form', ticketFormRouter);

//QR認証
const qrVerifyRouter = require('./Authentication/jsoncheck.js');
app.use('/Authentication', qrVerifyRouter);

// 静的ファイルの配信（publicフォルダ内）
app.use(express.static(path.join(__dirname, 'public')));

//サーバーのip取得
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}


// サーバ起動
app.listen(PORT, '0.0.0.0',() => {//'0.0.0.0'がLAN内アクセスを可能にする
  console.log(`✅ サーバ稼働中: http://localhost:${PORT}`);
  console.log(`➡ フォームHTML: http://localhost:${PORT}/views/form.html`);
  console.log(`➡ データHTML: http://localhost:${PORT}/Authentication/result.html`);
  console.log(`LAN: http://${getLocalIP()}:${PORT}`);

});

/*

作成開始　2025.10.31
QRコード読み取り　2025.10.31
データ更新(作成)　2025.11.01
データ更新(更新)　2025.11.03
QR生成　　　　　　2025.11.09
QR認証(更新中)　　2025.11.09
QR認証(完成)　　　2025.11.12
生成重複の修正　　2025.11.12
フォーム作成　　　2025.11.19
LAN内公開        2025.11.21
排他処理作成　　　2025.11.21

*/