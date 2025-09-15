const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const minos = [
  { name: 'I', color: '#00BCD4', shape: [[0,0,0,0],[1,1,1,1]] },
  { name: 'O', color: '#ffe53b', shape: [[1,1],[1,1]] },
  { name: 'T', color: '#9C27B0', shape: [[0,1,0],[1,1,1]] },
  { name: 'S', color: '#27c52c', shape: [[0,1,1],[1,1,0]] },
  { name: 'Z', color: '#F44336', shape: [[1,1,0],[0,1,1]] },
  { name: 'J', color: '#3F51B5', shape: [[1,0,0],[1,1,1]] },
  { name: 'L', color: '#ff9100', shape: [[0,0,1],[1,1,1]] },
];

const outDir = path.join(__dirname, '..', 'public', 'img');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const mino of minos) {
  console.log(`Generating ${mino.name}.png ...`);
  const canvas = createCanvas(mino.shape[0].length * 4, mino.shape.length * 4);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = mino.color;
  for (let y = 0; y < mino.shape.length; y++) {
    for (let x = 0; x < mino.shape[y].length; x++) {
      if (mino.shape[y][x]) ctx.fillRect(x*4, y*4, 4, 4);
    }
  }
  const outPath = path.join(outDir, `${mino.name}.png`);
  const out = fs.createWriteStream(outPath);
  canvas.createPNGStream().pipe(out);
  out.on('finish', () => {
    console.log(`${mino.name}.png saved to ${outPath}`);
  });
}
