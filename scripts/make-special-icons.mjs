import {mkdirSync,writeFileSync} from 'node:fs';
// Original pixel-grid vector art; source is retained so the item palette stays editable.
const out=new URL('../public/specials/',import.meta.url);mkdirSync(out,{recursive:true});
const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const path=(d,c)=>`<path d="${d}" fill="${c}"/>`;
const save=(name,body)=>writeFileSync(new URL(name+'.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges">${body}</svg>`);
const ink='#08172c',gold='#ffd76b',white='#fff0ce',blue='#1366b0';
save('workbook',r(12,5,40,55,ink)+r(16,7,33,49,'#082e68')+r(18,9,29,44,blue)+r(18,9,4,44,'#348cda')+r(23,12,22,1,'#54abe1')+r(17,54,31,4,white)+r(17,56,28,1,'#b39e7a')+r(13,8,3,48,'#3974ad')+path('M29 19h9v3h4v9h-4v4h-9v-4h-4v-9h4z',gold)+path('M30 23h7v7h-7z','#248875')+r(31,24,5,5,white)+r(24,39,18,2,gold)+r(26,43,14,2,gold)+r(29,48,8,1,'#7ac5f0'));
save('windjar',r(23,5,18,5,ink)+r(25,5,14,3,gold)+r(21,10,22,4,'#bf873c')+path('M20 14h24v5h5v35h-5v5H20v-5h-5V19h5z',ink)+path('M21 17h22v5h3v30h-4v4H22v-4h-4V22h3z','#3d9bae')+r(21,20,5,28,'#a4f5e6')+r(27,22,16,30,'#286675')+path('M28 25h11v3H28zm-3 6h16v3H25zm3 6h14v3H28zm-1 6h10v3H27z',white)+r(26,49,15,3,'#59d7d2')+r(22,18,19,2,'#dcffff'));
save('goblet',path('M15 9h34v23h-5v6h-8v12h9v8H19v-8h9V38h-8v-6h-5z',ink)+r(18,12,28,15,gold)+r(21,27,22,7,'#bf7d31')+r(26,34,12,5,'#e0ac4e')+r(30,39,4,12,gold)+r(22,52,20,3,gold)+r(21,15,22,9,'#8d173b')+r(23,15,18,3,'#ef4e72')+path('M20 20h5v4h5v-3h4v3h5v-4h5v8h-5v4h-5v3h-4v-3h-5v-4h-5z','#27183a')+r(29,26,2,2,white)+r(34,26,2,2,white));
save('radio',r(39,2,5,17,ink)+r(40,3,2,13,'#a9bfc7')+r(14,14,36,46,ink)+r(17,17,30,39,'#33434a')+r(18,17,4,39,'#647982')+r(23,21,21,15,ink)+r(25,23,17,10,'#6cad56')+path('M26 27h4v-2h4v5h3v-3h4v2h-3v3h-6v-5h-1v2h-5z','#d5ff8b')+r(23,39,11,12,'#892735')+r(25,40,7,7,'#ff5d58')+r(37,40,7,2,gold)+r(37,44,7,2,gold)+r(23,53,20,1,'#92acb2'));
save('flag',r(13,4,6,56,ink)+r(15,6,2,52,'#e3b45c')+path('M19 8h26v4h11v28H41v-4H19z',ink)+path('M19 11h25v4h9v22H42v-4H19z','#c72c46')+r(20,12,4,19,'#f25969')+path('M27 23h3v-4h8v4h3v7H27z',white)+r(31,24,5,6,'#a42a3d')+r(42,16,3,19,'#9b1f37')+r(9,58,14,3,'#aa813c'));
save('handlebar',path('M5 17h13v8h8v-6h12v6h8v-8h13v12H48v8H37v16H27V37H16v-8H5z',ink)+r(7,19,9,6,'#75a68d')+r(48,19,9,6,'#75a68d')+r(17,26,11,5,'#a0b0b7')+r(37,26,11,5,'#a0b0b7')+r(27,23,11,18,'#edc247')+r(29,25,7,10,'#203d42')+r(31,26,2,6,'#a4f08a')+r(29,42,6,9,'#619276')+r(9,20,2,5,white)+r(52,20,2,5,white));
