import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../design-modern/',import.meta.url));
const production=process.argv.includes('--production');
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
const css=await fs.readFile(path.join(root,'style.css'),'utf8');
const refinements=await fs.readFile(path.join(root,'refinements.css'),'utf8');
let fonts=await fs.readFile(path.join(root,'fonts.css'),'utf8');
for(const weight of [400,500,600,700]){
 const file=`poppins-${weight}.woff2`;
 fonts=fonts.replace(file,`data:font/woff2;base64,${(await fs.readFile(path.join(root,file))).toString('base64')}`);
}
const json=production?'':(await fs.readFile(path.join(root,'data.json'),'utf8')).replaceAll('<','\\u003c');
const iconModule=(await fs.readFile(path.join(root,'lucide-icons.js'),'utf8')).replace('export function lucideIcon','function lucideIcon');
let app=iconModule+'\n'+(await fs.readFile(path.join(root,'app.js'),'utf8')).replace("import { lucideIcon } from './lucide-icons.js';",'');
if(production) app=app.replace("const PREVIEW = ['localhost', '127.0.0.1', ''].includes(location.hostname);",'const PREVIEW = false;');
else app=app.replace("if (PREVIEW) data = await getJson('data.json');","if (PREVIEW) data = JSON.parse(document.getElementById('snapshot').textContent);");
html=html.replace('<link rel="stylesheet" href="fonts.css">',()=>`<style>${fonts}</style>`).replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',()=>`${production?'':`<script type="application/json" id="snapshot">${json}</script>`}<script type="module">${app}</script>`);
html=html.replace('<link rel="stylesheet" href="refinements.css">',()=>`<style>${refinements}</style>`);
for(const name of ['brand-mark.svg','brand-word.svg','favicon.png']) {
 const mime=name.endsWith('.svg')?'image/svg+xml':'image/png';
 html=html.replaceAll(`"${name}"`,`"data:${mime};base64,${(await fs.readFile(path.join(root,name))).toString('base64')}"`);
}
for(const license of ['OFL.txt','LUCIDE-LICENSE.txt']) {
 const text=await fs.readFile(path.join(root,license),'utf8');
 html=html.replace('</head>',()=>`<script type="text/plain" data-license="${license}">${text}</script></head>`);
}
if(production) {
 html=html.replace('</head>','<meta name="wanderlist-status-design" content="modern-20261101"></head>');
 await fs.writeFile(new URL('../assets/index.html',import.meta.url),html);
 console.log('Production status page built at assets/index.html, with live data and embedded assets.');
}else{
 await fs.writeFile(path.join(root,'preview.html'),html);
 await fs.writeFile(new URL('../design-preview/preview.html',import.meta.url),html);
 console.log('Modern standalone preview exported; previous preview tab updated.');
}
