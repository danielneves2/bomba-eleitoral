// Shared presentation and rules for the nine fictional arcade abilities.
export const SPECIAL_DAMAGE = 2;
export const SPECIALS = [
  {name:'Fortaleza de picanha',item:'Picanha',asset:'steak',type:3,desc:'E ergue o escudo. Proteção total por 4 segundos.'},
  {name:'Motociata turbo',item:'Guidão',asset:'handlebar',type:6,desc:'E monta por 6s. E de novo dá arrancada; contato tira 2 corações.'},
  {name:'Pote de vento',item:'Pote de vento',asset:'windjar',type:7,desc:'E estoca por 8s. E solta uma rajada de 2 corações e empurra bombas.'},
  {name:'Cálice do vampiro',item:'Cálice',asset:'goblet',type:8,desc:'E protege de um golpe fatal por 10s. E troca o pacto por uma mordida de 2 corações.'},
  {name:'Exorcismo da carteira',item:'Carteira azul',asset:'workbook',type:9,desc:'E equipa. Mire em quem olha para você e aperte E: hipnose por 3 segundos.'},
  {name:'Missão: controle remoto',item:'Rádio detonador',asset:'radio',type:10,desc:'E equipa por 12s. Plante bombas e aperte E para detoná-las com dano de 2 corações.'},
  {name:'Lâmina do Kogos',item:'Lâmina',asset:'sword',type:5,desc:'E equipa por 8s. Clique para golpes rápidos de 2 corações.'},
  {name:'Bandeira da ocupação',item:'Bandeira',asset:'flag',type:11,desc:'E equipa. Mire no chão livre e E ergue barricadas por 8 segundos.'},
  {name:'Cadeira voadora',item:'Cadeira',asset:'chair',type:4,desc:'E levanta. Clique ou E arremessa: 2 corações e atordoamento.'},
];
export const itemIcon = asset => ['steak','sword','chair'].includes(asset)
  ? `/item-${asset}-pixel-v11.png` : `/specials/${asset}.svg`;

export function faces(from, to, cosine = .55) {
  const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);
  if(d<.05)return true;
  return (-Math.sin(from.yaw||0)*dx-Math.cos(from.yaw||0)*dz)/d>=cosine;
}

export function equipment(game) {
  const times=[game.player.picanhaTime,game.player.ram,game.player.wind,game.player.vampire,game.bookTime,game.remoteTime,game.swordTime,game.flagTime,game.chairReady?1:0];
  const time=times[game.character]||0,meta=SPECIALS[game.character];
  const actions=['PROTEÇÃO TOTAL','E · ARRANCADA','E · SOLTAR RAJADA','E · MORDIDA / AGUARDE · REVIVER',game.hypnosisTarget()?'OLHOU! E · HIPNOTIZAR':'MIRE EM QUEM OLHA PARA VOCÊ','E · DETONAR SUAS BOMBAS','CLIQUE · GOLPEAR','E · FINCAR BANDEIRA','CLIQUE OU E · ARREMESSAR'];
  return {time,name:meta.name,icon:itemIcon(meta.asset),action:time>0?actions[game.character]:'E · EQUIPAR',ready:time>0&&![0,6].includes(game.character)};
}
