// Shared presentation and rules for the nine fictional arcade abilities.
export const SPECIAL_DAMAGE = 2;
export const SPECIALS = [
  {name:'Fortaleza de picanha',item:'Picanha',asset:'steak',type:3,desc:'E ergue o escudo. Proteção total por 4 segundos.'},
  {name:'Pronunciamento tóxico',item:'Microfone',asset:'microphone',type:6,desc:'E faz o discurso global. Névoa verde e antídotos limitados; uma dose vira jacaré!'},
  {name:'Pote de vento',item:'Pote de vento',asset:'windjar',type:7,desc:'E estoca por 8s. E solta uma rajada de 2 corações e empurra bombas.'},
  {name:'Voo do vampiro',item:'Cálice',asset:'goblet',type:8,desc:'E transforma: voe invulnerável por 10s. Q troca o rival, E mergulha e drena 2 corações.'},
  {name:'Exorcismo da carteira',item:'Carteira azul',asset:'workbook',type:9,desc:'E equipa. Mire em quem olha para você e aperte E: espírito sobe e o rival cai por 5 segundos.'},
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

// `f` e o lutador dono deste equipamento: o heroi local por padrao, ou um
// convidado no multiplayer. Cada um carrega os proprios tempos.
export function equipment(game, f = game.player) {
  const times=[f.picanhaTime,game.speechTime||game.poison?.time||0,f.wind,f.vampire,f.bookTime,f.remoteTime,f.swordTime,f.flagTime,f.chairReady?1:0];
  const character=game.characterOf?game.characterOf(f):game.character;
  const time=times[character]||0,meta=SPECIALS[character];
  const actions=['PROTEÇÃO TOTAL','VOCÊ É IMUNE À NÉVOA','E · SOLTAR RAJADA','Q · TROCAR ALVO / E · MERGULHAR',game.hypnosisTarget(f)?'OLHOU! E · HIPNOTIZAR':'MIRE EM QUEM OLHA PARA VOCÊ','E · DETONAR SUAS BOMBAS','CLIQUE · GOLPEAR','E · FINCAR BANDEIRA','CLIQUE OU E · ARREMESSAR'];
  return {time,name:meta.name,icon:itemIcon(meta.asset),action:time>0?actions[character]:'E · EQUIPAR',ready:time>0&&![0,1,6].includes(character)};
}
