// Webカメラの起動
const video = document.getElementById('video');
let contentWidth;
let contentHeight;

const media = navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 640, height: 480 } })
   .then((stream) => {
      video.srcObject = stream;
      video.onloadeddata = () => {
         video.play();
         contentWidth = video.clientWidth;
         contentHeight = video.clientHeight;
         canvasUpdate();
         checkImage();
      }
   }).catch((e) => {
      console.log(e);
   });

// カメラ映像のキャンバス表示
const cvs = document.getElementById('camera-canvas');
const ctx = cvs.getContext('2d', { willReadFrequently: true });
const canvasUpdate = () => {
   cvs.width = contentWidth;
   cvs.height = contentHeight;
   ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
   requestAnimationFrame(canvasUpdate);
}

// QRコードの検出
let Previous_code = false
let Timeout
const rectCvs = document.getElementById('rect-canvas');
const rectCtx = rectCvs.getContext('2d');
const checkImage = () => {
   // imageDataを作る
   const imageData = ctx.getImageData(0, 0, contentWidth, contentHeight);
   // jsQRに渡す
   const code = jsQR(imageData.data, contentWidth, contentHeight);

   // 検出結果に合わせて処理を実施
   if (code) {
      drawRect(code.location);
      document.getElementById('qr-msg').textContent = `QRコード：${code.data}`;//html書き換え
      clearTimeout(Timeout);//タイムアウトまでの時間更新
      Timeout = setTimeout(() => Previous_code = false, 1500);//タイムアウト 1.5s
      if (Previous_code !== code.data) {
         console.log("QRcodeが見つかりました", code);
         Previous_code = code.data
         sendId(code.data)//apiにid送信
      }
   } else {
      rectCtx.clearRect(0, 0, contentWidth, contentHeight);
      document.getElementById('qr-msg').textContent = `QRコード: 見つかりません`;
   }
   setTimeout(() => { checkImage() }, 500);
}

// 四辺形の描画
const drawRect = (location) => {
   rectCvs.width = contentWidth;
   rectCvs.height = contentHeight;
   drawLine(location.topLeftCorner, location.topRightCorner);
   drawLine(location.topRightCorner, location.bottomRightCorner);
   drawLine(location.bottomRightCorner, location.bottomLeftCorner);
   drawLine(location.bottomLeftCorner, location.topLeftCorner)
}

// 線の描画
const drawLine = (begin, end) => {
   rectCtx.lineWidth = 4;
   rectCtx.strokeStyle = "#F00";
   rectCtx.beginPath();
   rectCtx.moveTo(begin.x, begin.y);
   rectCtx.lineTo(end.x, end.y);
   rectCtx.stroke();
}

// 指定周波数音を出す
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let timeout

function playMelody({ hz, ms = 100, repeat = 1, Delay = 0 , first_Delay = false }) {
 if (repeat > 1 && Delay === 0) Delay = 100 
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  for (let i = 0; i < repeat; i++) {
   if (i === 0 && first_Delay === false) timeout = ms
   else timeout = ms + Delay
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      osc.frequency.value = hz;

      osc.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      osc.start(now);
      osc.stop(now + ms / 1000);
    }, i * (timeout));
  }
}

//コードぐちゃぐちゃですみません

//api送信
async function sendId(id) {
  try {
    const res = await fetch('/Authentication/qr-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ QR: id })
    });//送信

    const data = await res.json();//受信

    console.log(data.message); // 必要に応じて画面表示に変える
    if (data.success) playMelody({ hz:3200 })
      else playMelody({ hz:3200 , ms:100, repeat:3, Delay:75})
    return data;

  } catch (err) {
    console.error('送信中にエラーが発生しました', err);
    return null;
  }
}