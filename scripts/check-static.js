const fs = require('fs');
const { execFileSync } = require('child_process');

function checkCssBraces(filePath) {
  const css = fs.readFileSync(filePath, 'utf8');
  let balance = 0;
  let minBalance = 0;
  for (const char of css) {
    if (char === '{') balance += 1;
    if (char === '}') {
      balance -= 1;
      minBalance = Math.min(minBalance, balance);
    }
  }
  if (balance !== 0 || minBalance < 0) {
    throw new Error(`${filePath} CSS brace balance failed: balance=${balance}, min=${minBalance}`);
  }
  console.log(`${filePath}: CSS brace balance OK`);
}

function checkFileExists(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`${filePath} is missing`);
}

checkFileExists('index.html');
checkFileExists('assets/app.css');
checkFileExists('assets/poster-core.js');
checkFileExists('assets/frame-store.js');
checkFileExists('assets/poster-renderer.js');
checkFileExists('assets/frame-editor.js');
checkFileExists('assets/poster-canvas.js');
checkFileExists('assets/export-assets.js');
checkFileExists('assets/rules-parser.js');
checkFileExists('assets/app.js');
checkCssBraces('assets/app.css');
execFileSync(process.execPath, ['--check', 'assets/poster-core.js'], { stdio: 'inherit' });
console.log('assets/poster-core.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/frame-store.js'], { stdio: 'inherit' });
console.log('assets/frame-store.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/poster-renderer.js'], { stdio: 'inherit' });
console.log('assets/poster-renderer.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/frame-editor.js'], { stdio: 'inherit' });
console.log('assets/frame-editor.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/poster-canvas.js'], { stdio: 'inherit' });
console.log('assets/poster-canvas.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/export-assets.js'], { stdio: 'inherit' });
console.log('assets/export-assets.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/rules-parser.js'], { stdio: 'inherit' });
console.log('assets/rules-parser.js: JS syntax OK');
execFileSync(process.execPath, ['--check', 'assets/app.js'], { stdio: 'inherit' });
console.log('assets/app.js: JS syntax OK');
