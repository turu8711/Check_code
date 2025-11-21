const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateQR, generateQRDataURL } = require('./utils.js');
const router = express.Router();
const SECRET = process.env.SECRET || 'DEFAULT_SECRET';
const dataPath = path.join(__dirname, '../Authentication/data.json');
const lockFile = path.join(__dirname, '../Authentication/data.lock');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));//dataファイル

// 続柄マップ
const relationshipMap = {
  0: "父",
  1: "母",
  2: "兄",
  3: "姉",
  4: "弟",
  5: "妹",
  6: "祖父",
  7: "祖母"//増やす場合はticketIdの計算も変更すること
};

// フォーム表示
router.get('/', (req, res) => {
  res.send(form_HTML());
});

//フォーム入力確認画面
router.post('/confirm', express.urlencoded({ extended: true }), (req, res) => {
  const { number, Relationship, email } = req.body;

  res.send(confirm_HTML(number, Relationship, email))//確認画面
});

// QR生成
router.post('/generate', express.urlencoded({ extended: true }), async (req, res) => {
  let { number, Relationship, email } = req.body;  // ← 必須
  number = parseInt(number, 10);
  Relationship = parseInt(Relationship, 10);
  const ticketId = number * 10 + Relationship//ここ

  if (isNaN(ticketId)) return res.status(400).send('無効なチケットID');

  const result = await addTicketWithLock(number, Relationship, email, ticketId)//排他処理

  if (!result.success) res.status(result.code).send(result.message);
  if (result.success) res.send(result.html)

});

module.exports = router;

async function addTicketWithLock(number, Relationship, email, ticketId) {
  // ロック取得（他リクエストは待機）
  while (fs.existsSync(lockFile)) {
    await new Promise(r => setTimeout(r, 5));//5msごとにチェック
  }
  fs.writeFileSync(lockFile, 'locked');

  try {
    // 重複検索
    const ticket = data.find(d => d.ID === ticketId);
    if (ticket) return { success: false, code: 400, message: "すでに登録済みです" };

    //QRコード
    const year = new Date().getFullYear();//今年度
    const { qrString, token } = generateQR(ticketId, year, SECRET);//QR生成
    const qrDataUrl = await generateQRDataURL(qrString);

    // JSONに保存
    data.push({
      ID: ticketId,
      認証: false,
      状態: "未入場",
      認証時刻: "",
      生徒番号: number,
      続柄: relationshipMap[Relationship],
      email: email,
      token: token,
      年度: year
    });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

    return {
      success: true,
      html: result_HTML(ticketId, Relationship, email, qrDataUrl, qrString)
    };
  } catch (err) {
    console.error('QR生成エラー:', err);
    return ({ success: false, code: 500, message: 'QR生成中にエラーが発生しました' })
  } finally {
    // ロック解除
    fs.unlinkSync(lockFile);
  }
}

function confirm_HTML(number, Relationship, email) {
  return (`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>確認画面</title>
      <link rel="stylesheet" href="/css/form.css">
    </head>
    <body>
      <h1>確認画面</h1>
      <div class="form-box">
        <h2>入力内容</h2>

        <div class="confirm-item">
          <strong>学籍番号:</strong>
          <span>${number}</span>
        </div>

        <div class="confirm-item">
          <strong>生徒との続柄:</strong>
          <span>${relationshipMap[Relationship]}</span>
        </div>

        <div class="confirm-item">
          <strong>メールアドレス:</strong>
          <span>${email}</span>
        </div>

        <form method="POST" action="/form/generate" class="form-footer">
          <input type="hidden" name="number" value=${number}>
          <input type="hidden" name="Relationship" value=${Relationship}>
          <input type="hidden" name="email" value=${email}>
          <button type="submit" class="next-btn">この内容でチケット発行</button>
        </form>

        <div class="form-footer">
          <button onclick="history.back()" class="cancel-btn">戻る</button>
        </div>
      </div>
    </body>
    </html>
  `);
}

function result_HTML(ticketId, Relationship, email, qrDataUrl, qrString) {
  return (`
  <h2>生成QRコード（学籍番号: ${ticketId}）</h2>
  <p>続柄: ${relationshipMap[Relationship]}</p>
  <p>メール: ${email}</p>
  <img src="${qrDataUrl}" alt="QRコード">
  <p>QR文字列: ${qrString}</p>
  <a href="/form">戻る</a>
  `)
}//QR文字列は実装時削除すること！！----------------------------------------------------

function form_HTML() {
  return (`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="refresh" content="0; URL=/views/form.html">
      <title>リダイレクト中…</title>
    </head>
    <body>
      <p>リダイレクト中...</p>
      <p>自動的に移動しない場合は <a href="/views/form.html">こちらをクリック</a>。</p>
    </body>
    </html>
  `)
}