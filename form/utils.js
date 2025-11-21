const crypto = require('crypto');
const QRCode = require('qrcode');

function generateQR(ticketId, year, secret) {
  const ticketIdHex = ticketId.toString(16);
  const token = crypto.randomBytes(8).toString('hex'); // ランダムトークン

  const payload = `${year}:${ticketIdHex}:${token}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const qrString = `${payload}:${sig}`; // QRに入れる最終文字列
  return { qrString, token };
}

async function generateQRDataURL(qrString) {
  return await QRCode.toDataURL(qrString, { width: 300 });
}

// 署名検証関数
function verifyQR(qrString, secret) {
  const parts = qrString.split(':');
  if (parts.length !== 4) return false; // 年度:ID:token:署名

  const [year, idHex, token, sig] = parts;
  const payload = `${year}:${idHex}:${token}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return expectedSig === sig ? { year, ticketId: parseInt(idHex, 16), token } : false;
}

module.exports = { generateQR, generateQRDataURL };
