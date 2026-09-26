const fs=require('fs');
const files=['data.js','content.js','gen.js','engine.js','engine2.js','render.js','audio.js','ui.js'];
const atlas=fs.readFileSync('assets/atlas.png').toString('base64');
const idx=JSON.parse(fs.readFileSync('assets/atlas.json','utf8'));
const title=fs.readFileSync('assets/title.jpg').toString('base64');
const assets=`window.ASSETS={atlas:'data:image/png;base64,${atlas}',index:${JSON.stringify(idx.sprites)},title:'data:image/jpeg;base64,${title}'};`;
const scripts=[`<script>${assets}</script>`].concat(files.map(f=>`<script>\n/* ==== ${f} ==== */\n${fs.readFileSync(f,'utf8')}\n</script>`)).join('\n');
const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#07070a">
<title>Fractured City: Night Run</title>
</head>
<body>
<div id="root"></div>
${scripts}
</body>
</html>
`;
fs.writeFileSync('index.html',html);
console.log('built, bytes:',html.length);
