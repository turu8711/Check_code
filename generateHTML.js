const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'Authentication', 'data.json');
const HTML_FILE = path.join(__dirname, 'Authentication', 'result.html');

// JSON → HTML変換
async function generateHTML() {
  try {
    const jsonData = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(jsonData);

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('⚠ data.json に有効な配列データがありません');
      return;
    }

    const rows = data.map(item => `
      <tr>
        ${Object.values(item).map(v => `<td>${v}</td>`).join('')}
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>データ一覧</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>データ一覧</h2>
        <table>
          <thead>
            <tr>${Object.keys(data[0]).map(k => `<th>${k}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;

    await fs.writeFile(HTML_FILE, html, 'utf8');
    console.log('✅ result.html を生成しました');
  } catch (err) {
    console.error('❌ HTML生成中にエラー:', err);
  }
}

module.exports = { generateHTML };
