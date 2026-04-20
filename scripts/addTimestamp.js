const fs = require('fs');
const path = require('path');

function addTimestampToHTML() {
  const distPath = path.join(__dirname, '..', 'dist');
  const htmlFile = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(htmlFile)) {
    console.error('找不到 dist/index.html 文件');
    // return;
    process.exit(1);
  }
  
  let content = fs.readFileSync(htmlFile, 'utf-8');
  const timestamp = new Date().getTime();
  
  // 为 umi.*.js 文件添加时间戳 - 匹配 src="xxx" 但不包含结尾引号
  content = content.replace(
    /(<script[^>]*src="\/umi\.[^"]*\.js)(?!\?)/gi,
    (match) => `${match}?t=${timestamp}`
  );
  
  // 为 umi.*.css 文件添加时间戳
  content = content.replace(
    /(<link[^>]*href="\/umi\.[^"]*\.css)(?!\?)/gi,
    (match) => `${match}?t=${timestamp}`
  );
  
  // 为 preload_helper.*.js 文件添加时间戳
  content = content.replace(
    /(<script[^>]*src="\/preload_helper\.[^"]*\.js)(?!\?)/gi,
    (match) => `${match}?t=${timestamp}`
  );
  
  fs.writeFileSync(htmlFile, content, 'utf-8');
  console.log(`已为 index.html 中的资源添加时间戳：${timestamp}`);
}

addTimestampToHTML();