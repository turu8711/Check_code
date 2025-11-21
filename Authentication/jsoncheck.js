const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const SECRET = process.env.SECRET || 'DEFAULT_SECRET';
const DATA_FILE = path.join(__dirname, 'data.json');
const lockFile = path.join(__dirname, 'data.lock');

// POST /Authentication/qr-verify
// body: { 年度, ID, token, sig }
router.post('/qr-verify', express.json(), async(req, res) => {
  let { QR } = req.body; // 送信データは { QR: "2025:..." }

  // 分解
  let [year, ID, token, sig] = QR.split(':');
  if (!year || !ID || !token || !sig) {
    return res.status(400).send({ success: false, message: "QRフォーマットが不正です" });
  }//年度 : ID : token : 署名  が必要

  // 署名検証
  const payload = `${year}:${ID}:${token}`;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (sig !== expectedSig) return res.status(400).send({ success: false, message: "不正なQRです" });

  //変換
  const info = {
    ID: parseInt(ID, 16),
    year: parseInt(year, 10),
    token: token
  }

  const result = await checkTicketWithLock(info);//排他制御

  if (!result.success) {
    return res.status(result.code).send({message: result.message});
  }

  res.send(result);
});

module.exports = router;


async function checkTicketWithLock(info) {
  // ロック取得（他リクエストは待機）
  while (fs.existsSync(lockFile)) {
    await new Promise(r => setTimeout(r, 5));//5msごとにチェック
  }
  fs.writeFileSync(lockFile, 'locked');

  try {
    // JSON検索
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const ticket = data.find(d => d.ID === info.ID && d.token === info.token && d.年度 == info.year);
    if (!ticket) return ({ success: false, code: 404, message: "該当チケットが見つかりません" });
    if (ticket.認証) return ({ success: false, code: 200, message: "すでに認証済みです" });

    // 認証更新
    ticket.認証 = true;
    ticket.状態 = "入場済み";
    // JST時刻
    const now = new Date();
    ticket.認証時刻 = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, message: `認証成功   チケットID: ${info.ID}` };
  } finally {
    // ロック解除
    fs.unlinkSync(lockFile);
  }
}
