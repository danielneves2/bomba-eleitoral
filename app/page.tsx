'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {SPECIALS} from '../public/game/specials.mjs';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Bomb,
  Flame,
  Volume2,
  VolumeX,
  Maximize,
  Pause,
  ArrowRight,
  Crosshair,
  Zap,
  Trophy,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';
const cast = [
  {
    name: 'Lula',
    title: 'O veterano',
    color: '#ff506d',
    quote: 'Nunca antes na história deste país',
    special: 'Picanha para todos',
    desc: 'Escudo de picanha: 4 segundos invulnerável. Encontre mais nas caixas!',
    source:
      'https://www1.folha.uol.com.br/fsp/mundo/67032-bordao-de-lula-nunca-antes-na-historia-ganha-versao-em-peca-de-tv-de-chavez.shtml',
  },
  {
    name: 'Bolsonaro',
    title: 'O capitão',
    color: '#b9f346',
    quote: 'Tá ok?',
    special: 'Motociata',
    desc: 'Arrancada que atropela e empurra os rivais.',
    source:
      'https://www1.folha.uol.com.br/poder/2019/10/esquece-o-psl-afirma-bolsonaro-ao-criticar-presidente-de-seu-partido.shtml',
  },
  {
    name: 'Dilma',
    title: 'A imprevisível',
    color: '#ffae4b',
    quote: 'Eu tô saudando a mandioca',
    special: 'Estocar o vento',
    desc: 'Absorve o próximo ataque e devolve uma rajada.',
    source:
      'https://m.folha.uol.com.br/poder/2015/06/1646966-em-cerimonia-com-indios-dilma-sauda-mandioca-e-fala-de-mulheres-sapiens.shtml',
  },
  {
    name: 'Temer',
    title: 'O imortal',
    color: '#be95ff',
    quote: 'Não renunciarei.',
    special: 'O vampiro não renuncia',
    desc: 'Nega um golpe fatal e retorna em forma de morcegos.',
    source:
      'https://www.biblioteca.presidencia.gov.br/presidencia/ex-presidentes/michel-temer/discursos-do-presidente-da-republica/declaracao-a-imprensa-do-presidente-da-republica-michel-temer-brasilia-df-1',
  },
  {
    name: 'Pablo Marçal',
    title: 'O estrategista',
    color: '#66b5ff',
    quote: 'Faz o M!',
    special: 'Muda o mindset',
    desc: 'Cria três ilusões que confundem os rivais.',
    source:
      'https://www.gazetasp.com.br/politica/pablo-marcal-diz-apenas-faz-o-m-ao-chegar-ao-debate-da-gazeta/1142743/',
  },
  {
    name: 'Renan Santos',
    title: 'O articulador',
    color: '#e9b54d',
    quote: 'O STF precisa voltar para a casinha',
    special: 'Missão: detonar',
    desc: 'Detona suas bombas já lançadas.',
    source:
      'https://www.gazetadopovo.com.br/vozes/entrelinhas/o-stf-precisa-voltar-para-a-casinha-afirma-renan-santos/',
  },
  {
    name: 'Paulo Kogos',
    title: 'O cavaleiro',
    color: '#eded9d',
    quote: 'Imposto é roubo',
    special: 'Lâmina do Kogos',
    desc: 'E equipa a lâmina por 8 segundos. Clique para golpes rápidos de 2 corações.',
    source:
      'https://mises.org.br/artigos/1563/impostoerouboestadoequadrilhaeoutrasconsideracoes/',
  },
  {
    name: 'Boulos',
    title: 'O mobilizador',
    color: '#ff5848',
    quote: 'Nós vamos virar essa eleição',
    special: 'Ocupação',
    desc: 'Ergue três barricadas temporárias ao seu redor.',
    source:
      'https://www.metropoles.com/sao-paulo/nos-vamos-virar-essa-eleicao-diz-boulos-em-ultimo-dia-de-campanha',
  },
  {
    name: 'Datena',
    title: 'O apresentador',
    color: '#91b9e5',
    quote: 'Me ajuda aí!',
    special: 'Cadeira voadora',
    desc: 'E levanta a cadeira. Mire e clique para arremessar, rebater e atordoar.',
    source:
      'https://tvefamosos.uol.com.br/colunas/flavio-ricco/2015/02/18/me-ajuda-ai---record-tambem-registrou-em-nome-dela-bordao-usado-pelo-datena.htm',
  },
].map((character,index)=>({...character,special:SPECIALS[index].name,desc:SPECIALS[index].desc}));
const invaderNames:Record<string,string>={putin:'Putin',trump:'Trump',kim:'Kim Jong-un',bukele:'Bukele'};
const invaderPowers:Record<string,string>={putin:'Bombas letais',trump:'Explosão letal',kim:'Mísseis letais',bukele:'Gaiola por 6s'};
const invaderIds=['putin','trump','kim','bukele'];
const initial = {
  invasion: { kind:'putin',stage:'scheduled',warning:7,remaining:14,duration:14,intro:0,introDuration:3,targeted:false,shots:0,wave:1,charging:false,charge:0,caged:0,lineup:[] as string[],schedule:[] as number[] },
  teamMode:false,playerTeam:'left',winnerTeam:null as string|null,teams:[] as Array<{id:string;alive:number}>,roster:[] as Array<{skin:number;team:string;hp:number}>,
  phase: 'menu',
  countdown: 0,
  arena: {id:'circo',name:'Circo do Caos',subtitle:'',color:'#d5ff46'},
  arenaRoll: {index:0,locked:false},
  arenaOptions: [] as Array<{id:string;name:string;subtitle:string;color:string;tiles:number[]}>,
  holding: false,
  fuse: 0,
  power: 0,
  winner: -1,
  overtime: false,
  hitMarker: 0,
  hitText: '',
  damageFlash: 0,
  shieldFlash: 0,
  hp: 3,
  kills: 0,
  score: 0,
  time: 180,
  bombs: 3,
  special: 1,
  chaos: 0,
  enemies: 5,
  quote: '',
  event: '',
  combo: 0,
  shield: false,
  shieldTime: 0,
  picanha: 0,
  specialItems: 0,
  swordTime: 0,
  chairReady:false,
  equipment:{time:0,name:'',icon:'',action:'',ready:false},hypnosisReady:false,hypnotized:[] as Array<{id:number;name:string;time:number}>,
  picanhaTime: 0,
  windTime: 0,
  vampireTime: 0,
  ramTime: 0,
  speechTime:0,poisonTime:0,antidotes:0,antidoteTotal:0,flying:false,diving:false,flightHeight:0,vampireTarget:null as number|null,
  vampireTargets:[] as Array<{id:number;skin:number;hp:number}>,draining:[] as Array<{id:number;skin:number;hp:number;time:number}>,
  propertyTime: 0,
  decoys: 0,
  barricades: 0,
  wave: 1,
};
type Snapshot = typeof initial;
type GameApi = {
  enterLobby: () => void;
  start: (character: number, mode: string) => void;
  pause: () => void;
  resume: () => void;
  menu: () => void;
  special: () => void;
  diveTarget: (id:number) => void;
  cycleTarget: () => void;
  throwBomb: () => void;
  plantBomb: () => void;
  quote: () => void;
  beginHold: () => void;
  releaseBomb: () => void;
  sensitivity: (value: number) => void;
  key: (code: string, down: boolean) => void;
  mute: (value: boolean) => void;
  destroy: () => void;
};
type GameWindow = Window & {
  loadCharacterAtlas: () => Promise<HTMLCanvasElement>;
  loadGameLogo:()=>Promise<string>;
  createBombaGame: (
    canvas: HTMLCanvasElement,
    onState: (state: Snapshot) => void,
    onError: (error: string) => void,
  ) => GameApi;
};
export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null),
    api = useRef<GameApi | null>(null),
    lastSpoken = useRef('');
  const [selected, select] = useState(0),
    [state, setState] = useState<Snapshot>(initial),
    [ready, setReady] = useState(false),
    [entered,setEntered]=useState(false),
    [setupStep,setSetupStep]=useState(0),
    [helpPage,setHelpPage]=useState(0),
    [logo,setLogo]=useState(''),
    [error, setError] = useState(''),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false),
    [mode, setMode] = useState('caos'),
    [teamSide,setTeamSide]=useState('left'),
    [sensitivity, setSensitivity] = useState(1);
  useEffect(() => {
    let disposed = false;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/game/boot.js?v=20';
    script.onload = async () => {
      if (disposed || !canvas.current) return;
      try {
        const gameWindow = window as unknown as GameWindow;
        gameWindow.loadGameLogo().then(url=>{if(!disposed)setLogo(url);}).catch(()=>{});
        await gameWindow.loadCharacterAtlas();
        if (disposed || !canvas.current) return;
        api.current = gameWindow.createBombaGame(
          canvas.current,
          (s: Snapshot) => setState(s),
          setError,
        );
        setReady(true);
      } catch {
        setError('Os personagens não carregaram. Recarregue a página.');
      }
    };
    script.onerror = () =>
      setError(
        'O motor 3D não carregou. Recarregue a página para tentar de novo.',
      );
    document.head.appendChild(script);
    return () => {
      disposed = true;
      script.remove();
      api.current?.destroy();
    };
  }, []);
  const playing = state.phase === 'playing',
    menu = state.phase === 'menu',
    ch = cast[selected];
  const start = () => {
    api.current?.start(selected, mode==='teams'?`teams-${teamSide}`:mode);
    setHelp(false);
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const speakPreview = (index: number) => {
    if (muted || lastSpoken.current === cast[index].name || !window.speechSynthesis)
      return;
    lastSpoken.current = cast[index].name;
    window.speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(cast[index].quote);
    line.lang = 'pt-BR';
    line.rate = 0.96;
    line.pitch = 1;
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith('pt-br'));
    if (voice) line.voice = voice;
    window.speechSynthesis.speak(line);
  };
  return (
    <main className={`arcade ${playing ? 'is-playing' : ''} ${state.phase==='spectating'?'is-spectating':''} ${state.picanhaTime>0?'is-picanha':''} ${state.teamMode?'is-teams':''} ${state.invasion.stage==='arrival'&&!menu?'is-arriving':''} ${menu&&!entered?'is-title':''}`}>
      <canvas
        ref={canvas}
        className="world"
        aria-label="Arena de bombas em primeira pessoa"
      />
      <div className="vignette" />
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Bomba Eleitoral início">
          <span className="nav-logo">{logo&&<img src={logo} alt="Bomba Eleitoral" width="2043" height="770"/>}</span>
          <small>ARCADE / 3D</small>
        </Link>
        <div className="top-actions">
          <span className="live-dot" />
          <span className="top-label">{menu?(entered?'ESCOLHA SEU LADO':'APERTE JOGAR'):state.arena.name.toUpperCase()}</span>
          <button
            className="icon-button"
            onClick={() => {
              setMuted(!muted);
              api.current?.mute(!muted);
            }}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            className="icon-button"
            onClick={fullscreen}
            aria-label="Tela cheia"
          >
            <Maximize />
          </button>
          {playing && (
            <button
              className="icon-button"
              onClick={() => api.current?.pause()}
              aria-label="Pausar"
            >
              <Pause />
            </button>
          )}
        </div>
      </header>
      {menu&&!entered&&<section className="title-screen" aria-label="Abertura do jogo">
        <div className="title-sparks" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>
        <div className="title-cast" aria-hidden="true">{[[2,0],[1,4]].map((duo,side)=><div key={side} className={`title-duo title-duo-${side===0?'left':'right'}`}>{duo.map((skin,i)=><div key={skin} className={`portrait portrait-${skin}`} style={{'--i':side*2+i} as React.CSSProperties}/>)}</div>)}</div>
        <div className="title-center">
          <span className="cartridge-label">BRASIL · ARCADE · 2026</span>
          <h1 className="title-logo">{logo?<img src={logo} alt="Bomba Eleitoral" width="2043" height="770"/>:<span>BOMBA<br/>ELEITORAL</span>}</h1>
          <p>O debate acabou. Agora é bomba.</p>
          <button className="play-button title-play" disabled={!ready||!!error} onClick={()=>{api.current?.enterLobby();setEntered(true);}}><Bomb/>{ready?'JOGAR':'CARREGANDO…'}<ArrowRight/></button>
          <span className="insert-credit">ESCOLHA SEU PERSONAGEM. DISPUTE A FAIXA.</span>
        </div>
        <div className="title-bottom"><span>3 ARENAS · 4 INVASORES · ZERO TRÉGUA</span><button onClick={()=>setHelp(true)}>COMO JOGAR</button></div>
      </section>}
      {menu && entered && (
        <section className={`lobby setup-step-${setupStep}`}>
          <div className="selection-heading"><button className="back-title" onClick={()=>setEntered(false)}>← INÍCIO</button><h1 className="scene-logo">{logo?<img src={logo} alt="Bomba Eleitoral" width="2043" height="770"/>:<span>BOMBA<br/>ELEITORAL</span>}</h1><span className="selection-step">PREPARE SEU MANDATO</span></div>
          <div className="selection-layout">
          <aside className="selected-fighter" style={{'--character':ch.color} as React.CSSProperties} aria-label={`Personagem selecionado: ${ch.name}`}>
            <span className="fighter-index">PLAYER 01</span><div className={`portrait portrait-${selected}`} aria-hidden="true"/>
            <div className="fighter-caption"><h2>{ch.name}</h2><span>{ch.title}</span></div><p>“{ch.quote}”</p>
          </aside>
          <div className="lobby-main">
            <div className="setup-tabs" aria-label="Etapas de preparação"><button aria-pressed={setupStep===0} onClick={()=>setSetupStep(0)}>1 · PERSONAGEM</button><button aria-pressed={setupStep===1} onClick={()=>setSetupStep(1)}>2 · MODO</button></div>
            <div className="character-step">
            <div className="eyebrow">
              <span /> PRIMEIRA PESSOA. ÚLTIMO SOBREVIVENTE.
            </div>
            <div className="choose-heading">
              <span>01 / ESCOLHA SEU PERSONAGEM</span>
              <small>{mode==='teams'?'3 de cada lado. Uma equipe vencedora.':'9 figuras. Uma faixa presidencial.'}</small>
            </div>
            <RadioGroup
              className="cast"
              value={String(selected)}
              onValueChange={(v) => select(Number(v))}
              aria-label="Escolha seu político"
            >
              {cast.map((c, i) => (
                <label
                  className={`character ${i === selected ? 'selected' : ''}`}
                  key={c.name}
                  style={{ '--character': c.color } as React.CSSProperties}
                >
                  <RadioGroupItem
                    className="character-radio"
                    value={String(i)}
                    aria-label={c.name}
                    onMouseEnter={() => speakPreview(i)}
                    onMouseLeave={() => {
                      lastSpoken.current = '';
                    }}
                    onFocus={() => speakPreview(i)}
                  />
                  <div className={`portrait portrait-${i}`} />
                  <span className="character-number">0{i + 1}</span>
                  <div className="character-name">{c.name}</div>
                  <small>{c.title}</small>
                  <span className="selected-mark">✦</span>
                </label>
              ))}
            </RadioGroup>
            <div
              className="character-info"
              style={{ '--character': ch.color } as React.CSSProperties}
            >
              <div>
                <Zap size={18} />
                <strong>{ch.special}</strong>
                <span>{ch.desc}</span>
              </div>
              <p>“{ch.quote}”</p>
            </div>
            </div>
            <div className="launch-row">
              <button className="play-button setup-next" onClick={()=>setSetupStep(1)}>ESCOLHER MODO <ArrowRight/></button>
              <button
                className="play-button launch-match"
                disabled={!ready || !!error}
                onClick={start}
              >
                <Bomb size={23} />
                {ready ? 'TOCAR O TERROR' : 'PREPARANDO A ARENA…'}
                <ArrowRight size={23} />
              </button>
              <button className="help-button" onClick={() => setHelp(true)}>
                COMO
                <br />
                JOGAR <Crosshair size={19} />
              </button>
            </div>
            <div className="mode-step">
            <div className="mode-step-heading">COMO VAI SER A DISPUTA?</div>
            <RadioGroup
              className="mode-select"
              value={mode}
              onValueChange={(v) => setMode(String(v))}
              aria-label="Modo de jogo"
            >
              <label htmlFor="mode-caos">
                <RadioGroupItem id="mode-caos" value="caos" /><span>CONTRA O SISTEMA<small>Você contra 8 bots</small></span>
              </label>
              <label htmlFor="mode-teams">
                <RadioGroupItem id="mode-teams" value="teams" /><span>ESQUERDA × DIREITA<small>Equipes de 3 · com bots</small></span>
              </label>
              <label htmlFor="mode-treino"><RadioGroupItem id="mode-treino" value="treino"/><span>AQUECIMENTO<small>Treine contra 3 bots</small></span></label>
            </RadioGroup>
            {mode==='teams'&&<RadioGroup className="team-choice" value={teamSide} onValueChange={v=>setTeamSide(String(v))} aria-label="Sua equipe">
              <label htmlFor="side-left"><RadioGroupItem id="side-left" value="left"/> ESQUERDA</label><label htmlFor="side-right"><RadioGroupItem id="side-right" value="right"/> DIREITA</label>
              <small>Você + 2 aliados contra 3 rivais. Sem fogo amigo. Equipes satíricas: qualquer personagem pode jogar dos dois lados.</small>
            </RadioGroup>}
            <div className="future-mode"><strong>CONTRA A POPULAÇÃO</strong><span>Multiplayer online · próxima etapa</span></div>
            </div>
          </div>
          </div>
          <aside className="arena-label">
            <div className="lobby-champion" aria-hidden="true"><div className={`portrait portrait-${selected}`} /></div>
            <div className="arena-tag">
              <span /> 03 ARENAS · SORTEIO A CADA PARTIDA
            </div>
            <h2>
              ONDE VAI
              <br />
              SER O CAOS?
            </h2>
            <p>
              Favela. Planalto. Circo.
              <br />
              A roleta escolhe o próximo destino.
            </p>
            <div className="arena-rule" />
            <span className="arena-features">
              BLOCOS DESTRUTÍVEIS
              <br />
              EXPLOSÕES EM CADEIA
              <br />
              ZERO HORÁRIO ELEITORAL
            </span>
          </aside>
          <footer className="lobby-footer">
            <span>
              <span className="status-led" /> {mode==='teams'?'3 × 3 · EQUIPES COM BOTS':'CONTRA BOTS · ARENA 3D'}
            </span>
            <span>SÁTIRA FICTÍCIA · SEM FILIAÇÃO POLÍTICA</span>
            <button onClick={() => setHelp(true)}>
              CONTROLES + CRÉDITOS ↗
            </button>
          </footer>
        </section>
      )}
      {!menu && (
        <>
          {['playing','spectating','paused'].includes(state.phase) && ['warning','arrival','active'].includes(state.invasion.stage) && (
            <aside className={`invasion-alert invasion-${state.invasion.stage}`} aria-label={`Invasão de ${state.invasion.kind === 'putin' ? 'Putin' : state.invasion.kind === 'kim' ? 'Kim Jong-un' : state.invasion.kind === 'bukele' ? 'Bukele' : 'Trump'}`}>
              <div className={`invader-portrait invader-${state.invasion.kind}`} />
              <div className="invasion-copy">
                <span>{state.invasion.stage === 'warning' ? `⚠ INVASÃO ${state.invasion.wave} DE 3` : state.invasion.stage === 'arrival' ? 'CHEGADA DO CONVIDADO' : `INVASOR ${state.invasion.wave} DE 3 NA ARENA`}</span>
                <strong>{state.invasion.kind === 'putin' ? 'PUTIN' : state.invasion.kind === 'kim' ? 'KIM JONG-UN' : state.invasion.kind === 'bukele' ? 'BUKELE' : 'TRUMP'} <b>{Math.ceil(state.invasion.stage === 'warning' ? state.invasion.warning : state.invasion.stage === 'arrival' ? state.invasion.intro : state.invasion.remaining)}s</b></strong>
                <small>{state.invasion.stage === 'warning' ? 'Prepare-se. O circo ganhou um convidado.' : state.invasion.kind === 'putin' ? 'Bombas letais · saia das marcas vermelhas!' : state.invasion.kind === 'kim' ? 'Mísseis letais · saia das marcas laranja!' : state.invasion.kind === 'bukele' ? 'Não deixe alcançar você: gaiola por 6 segundos!' : state.invasion.charging ? 'CRESCEU E FICOU VERMELHO? CORRA!' : 'Ele está procurando alguém. Não deixe chegar perto!'}</small>
                <Progress className="invasion-progress" aria-label={state.invasion.stage === 'warning' ? 'Chegada do invasor' : 'Tempo restante da invasão'} value={state.invasion.stage === 'warning' ? (1-state.invasion.warning/7)*100 : state.invasion.remaining/state.invasion.duration*100} />
              </div>
            </aside>
          )}
          {state.invasion.stage === 'arrival' && ['playing','spectating','paused'].includes(state.phase) && <div className="flyby-caption"><span>VISITA NADA DIPLOMÁTICA</span><strong>{state.invasion.kind === 'putin' ? 'PUTIN CHEGOU PELO AR' : state.invasion.kind === 'kim' ? 'PEQUENO KIM. ENORME PROBLEMA.' : state.invasion.kind === 'bukele' ? 'TODO MUNDO NA GRADE' : 'WELCOME TO AMERICA'}</strong><small>{state.invasion.kind === 'kim' ? 'Ele fica de boa. Os mísseis é que vão passear.' : state.invasion.kind==='trump'?'BIG EGO. BIG BOOM.':state.invasion.kind==='bukele'?'O microfone é dele. A gaiola pode ser sua.':'A partida continua após a chegada'}</small></div>}
          {state.invasion.caged > 0 && playing && <div className="targeted-alert cage-alert" role="status">PRESO POR BUKELE · {state.invasion.caged.toFixed(1)}s <small>Você ainda pode mirar, lançar bombas e usar o especial.</small></div>}
          {state.invasion.charging && state.invasion.stage === 'active' && playing && <div className="targeted-alert trump-charge-alert">TRUMP VAI EXPLODIR · {Math.max(0,2.4*(1-state.invasion.charge)).toFixed(1)}s · AFASTE-SE!</div>}
          {state.invasion.targeted && ['playing','spectating'].includes(state.phase) && <div className="targeted-alert" role="alert">{state.invasion.kind === 'kim' ? 'FOGUETE NA SUA DIREÇÃO' : 'NA MIRA DE PUTIN'} · SAIA DO CÍRCULO!</div>}
          <div className="hud">
            <div className="player-status">
              <div className={`hud-portrait portrait portrait-${selected}`} />
              <div>
                <span>{ch.name.toUpperCase()}</span>
                <div className="hearts" aria-label={`${state.hp} vidas`}>
                  {[0, 1, 2].map((n) => (
                    <span key={n} className={n < state.hp ? '' : 'empty'}>
                      ♥
                    </span>
                  ))}
                  {state.shield && <span className="shield-status" aria-label={`Escudo: ${Math.ceil(state.shieldTime)} segundos`}><Shield size={23} /><small>{Math.ceil(state.shieldTime)}s</small></span>}
                  {state.picanhaTime > 0 && <span className="special-effect picanha-effect" aria-label="Invulnerável"><img src="/item-steak-pixel-v11.png" width="28" height="28" alt="Picanha"/><small>{state.picanhaTime.toFixed(1)}s</small></span>}
                  {state.swordTime > 0 && <span className="special-effect"><img src="/item-sword-pixel-v11.png" width="28" height="28" alt="Espada"/><small>{state.swordTime.toFixed(1)}s · CLIQUE PARA GOLPEAR</small></span>}
                  {state.windTime > 0 && <span className="special-effect wind-effect" aria-label={`Vento estocado por ${Math.ceil(state.windTime)} segundos`}>VENTO <small>{Math.ceil(state.windTime)}s</small></span>}
                  {state.vampireTime > 0 && <span className="special-effect vampire-effect" aria-label={`Voo invulnerável por ${Math.ceil(state.vampireTime)} segundos`}>🦇<small>{Math.ceil(state.vampireTime)}s</small></span>}
                  {state.ramTime > 0 && <span className="special-effect ram-effect" aria-label={`Motociata por ${Math.ceil(state.ramTime)} segundos`}>MOTO <small>{Math.ceil(state.ramTime)}s</small></span>}
                  {state.propertyTime > 0 && <span className="special-effect property-effect" aria-label={`Propriedade privada por ${Math.ceil(state.propertyTime)} segundos`}>ÁREA <small>{Math.ceil(state.propertyTime)}s</small></span>}
                  {state.decoys > 0 && <span className="special-effect decoy-effect" aria-label={`${state.decoys} ilusões ativas`}>CÓPIAS <small>×{state.decoys}</small></span>}
                  {state.barricades > 0 && <span className="special-effect barricade-effect" aria-label={`${state.barricades} barricadas ativas`}>BARREIRAS <small>×{state.barricades}</small></span>}
                </div>
              </div>
            </div>
            <div className="timer">
              <small>
                {state.overtime ? 'MORTE SÚBITA' : 'TEMPO DO DEBATE'}
              </small>
              <strong>
                {Math.floor(state.time / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor(state.time % 60)
                  .toString()
                  .padStart(2, '0')}
              </strong>
            </div>
            <div className="score">
              <small>PONTUAÇÃO</small>
              <strong>{state.score.toString().padStart(6, '0')}</strong>
              <span>{state.enemies} RIVAIS NA ARENA · BOTS</span>
            </div>
          </div>
          <div
            className={`crosshair ${state.hitMarker > 0 ? 'hit-confirmed' : ''}`}
          >
            <span />
            <span />
          </div>
          {state.teamMode&&<><div className="team-score" aria-label="Sobreviventes por equipe">{state.teams.map(team=><span key={team.id} className={`team-${team.id}`}><b>{team.id==='left'?'ESQUERDA':'DIREITA'}</b> {team.alive}/3 {team.id===state.playerTeam?'· SEU TIME':''}</span>)}</div>
          <aside className="ally-roster" aria-label="Seus aliados"><strong>SEU ESQUADRÃO</strong>{state.roster.slice(1).filter(a=>a.team===state.playerTeam).map(a=><div key={a.skin} className={`ally-card ${a.hp<=0?'eliminated':''}`} aria-label={`${cast[a.skin].name}: ${a.hp>0?`${a.hp} vidas`:'eliminado'}`}><div className={`portrait portrait-${a.skin}`} aria-hidden="true"/><div><span>{cast[a.skin].name}</span><div className="ally-hearts" aria-hidden="true">{[0,1,2].map(n=><b key={n} className={n<a.hp?'':'empty'}>♥</b>)}</div><small>{a.hp>0?'ALIADO':'ELIMINADO'}</small></div></div>)}</aside></>}
          {state.hitMarker > 0 && <output className="hit-feedback">{state.hitText}</output>}
          <div className="damage-feedback" aria-hidden="true" style={{opacity:Math.min(1,state.damageFlash/.4)}} />
          <div className="shield-feedback" aria-hidden="true" style={{opacity:Math.min(1,state.shieldFlash/.35)}} />
          {state.damageFlash > 0 && <div className="damage-label">VOCÊ LEVOU DANO</div>}
          {state.shieldFlash > 0 && state.damageFlash <= 0 && <div className="damage-label blocked">ESCUDO BLOQUEOU</div>}
          <div className={`chaos-event ${state.event ? 'visible' : ''}`}>
            <Flame />
            {state.event}
          </div>
          {state.combo > 1 && (
            <div className="combo">
              {state.combo}× <span>CAOS EM CADEIA</span>
            </div>
          )}
          {state.quote && <div className="quote-bubble">“{state.quote}”</div>}
          <div className="bottom-hud">
            <div className="bomb-stock">
              <Bomb />
              <div>
                <small>BOMBAS</small>
                <strong>
                  {state.bombs} <span>/ 3</span>
                </strong>
              </div>
              <kbd>SEGURE</kbd>
            </div>
            <div className="chaos-meter">
              <div>
                <span>NÍVEL DE CAOS</span>
                <strong>{Math.floor(state.chaos)}%</strong>
              </div>
              <div className="meter-track">
                <i style={{ width: `${state.chaos}%` }} />
              </div>
              <small>
                {state.chaos > 75
                  ? 'O CIRCO ESTÁ PEGANDO FOGO!'
                  : 'Faça o espetáculo explodir.'}
              </small>
            </div>
            <button
              className={`special-button ${state.special >= 1 ? 'charged' : ''}`}
              onClick={() => api.current?.special()}
              disabled={state.special < 1 || !playing || state.countdown > 0 || state.invasion.stage==='arrival'||state.speechTime>0||state.diving||(selected===1&&state.poisonTime>0)}
            >
              <Zap />
              <span>
                {state.equipment.ready ? (['','','Soltar o vento','Mergulho vampírico','Exorcizar carteira','Detonar bombas','','Fincar bandeira','Arremessar cadeira'][selected]) : state.specialItems>0 ? SPECIALS[selected].item+' coletado' : ch.special}
                <small>
                  {state.equipment.ready?'E · USAR ITEM EQUIPADO':state.specialItems>0 ? `${state.specialItems} ITEM${state.specialItems>1?'S':''} · E PARA USAR` : state.special >= 1
                    ? 'ESPECIAL PRONTO'
                    : `CARREGANDO ${Math.floor(state.special * 100)}%`}
                </small>
              </span>
              <kbd>E</kbd>
              <i style={{ width: `${state.special * 100}%` }} />
            </button>
          </div>
          <div className="controls-strip">
            W A S D <span>MOVER</span> · MOUSE <span>MIRAR</span> · SEGURE /
            SOLTE <span>ARREMESSAR</span> · ESPAÇO <span>PLANTAR</span> · SHIFT{' '}
            <span>CORRER</span> · ESC <span>PAUSA</span>
          </div>
          <div className="touch-controls">
            <div className="touch-dpad">
              {[
                ['↑', 'KeyW'],
                ['←', 'KeyA'],
                ['↓', 'KeyS'],
                ['→', 'KeyD'],
              ].map(([label, key]) => (
                <button
                  key={key}
                  aria-label={`Mover ${label}`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    api.current?.key(key, true);
                  }}
                  onPointerUp={() => api.current?.key(key, false)}
                  onPointerCancel={() => api.current?.key(key, false)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="touch-actions">
              <button className="touch-utility" aria-label="Correr" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);api.current?.key('ShiftLeft',true);}} onPointerUp={()=>api.current?.key('ShiftLeft',false)} onPointerCancel={()=>api.current?.key('ShiftLeft',false)}>CORRER</button>
              <button className="touch-utility" aria-label="Plantar bomba" onClick={()=>api.current?.plantBomb()}>PLANTAR</button>
              <button className="touch-utility" aria-label="Soltar bordão" onClick={()=>api.current?.quote()}>FALA</button>
            <button
              className="touch-bomb"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                api.current?.beginHold();
              }}
              onPointerUp={() => api.current?.releaseBomb()}
              onPointerCancel={() => api.current?.releaseBomb()}
              aria-label={state.swordTime>0?'Segurar para golpear com a lâmina':state.chairReady?'Arremessar cadeira':'Segurar para mirar e soltar para arremessar bomba'}
            >
              {state.swordTime>0?<img src="/item-sword-pixel-v11.png" width="32" height="32" alt=""/>:state.chairReady?<img src="/item-chair-pixel-v11.png" width="32" height="32" alt=""/>:<Bomb />}
            </button>
            </div>
          </div>
        </>
      )}
      {!menu && state.countdown > 3 && state.phase!=='paused' && (
        <section className={`arena-roulette ${state.arenaRoll.locked?'arena-locked':''}`} aria-label="Sorteio de arena">
          <span className="arena-eyebrow">PRÓXIMO DESTINO</span>
          <h2>{state.arenaRoll.locked?'ARENA SELECIONADA':'ONDE VAI SER O CAOS?'}</h2>
          <div className="arena-cards">
            {state.arenaOptions.map((arena,index)=><article key={arena.id} className={`arena-card ${state.arenaRoll.index===index?'arena-current':''}`} style={{'--arena-color':arena.color} as React.CSSProperties}>
              <span className="arena-number">0{index+1}</span>
              <div className="arena-layout" aria-hidden="true">{arena.tiles.map((tile,i)=><i key={i} className={`arena-tile tile-${tile}`}/>)}</div>
              <strong>{arena.name}</strong><small>{arena.subtitle}</small>
              <b>{state.arenaRoll.index===index?(state.arenaRoll.locked?'SELECIONADA':'◀ SORTEANDO ▶'):'AGUARDANDO'}</b>
            </article>)}
          </div>
          <div className="invader-draft" aria-label="Três invasores sorteados em ordem de chegada">
            {state.invasion.lineup.map((kind,slot)=>{
              const locked=6.2-state.countdown>=.8+slot*.7;
              const shown=locked?kind:invaderIds[(Math.floor((6.2-state.countdown)*14)+slot)%4];
              return <div key={slot} className={`draft-slot ${locked?'draft-locked':''}`}>
                <div className={`invader-portrait invader-${shown}`} aria-hidden="true"/>
                <div><small>{slot+1}ª INVASÃO</small><strong>{invaderNames[shown]}</strong><span>{locked?invaderPowers[kind]:'Sorteando…'}</span></div>
              </div>;
            })}
          </div>
          <p role="status" aria-live="polite">{state.arenaRoll.locked?`${state.arena.name} · ${state.invasion.lineup.map(k=>invaderNames[k]).join(' → ')}`:'Uma arena. Três invasores. Sobreviva ao sorteio.'}</p>
          <div className="arena-roll-track"><i style={{transform:`scaleX(${Math.min(1,(6.2-state.countdown)/3.2)})`}}/></div>
        </section>
      )}
      {!menu && state.countdown > 0 && state.countdown <= 3 && (
        <div className="round-countdown">
          <div className={`portrait countdown-portrait portrait-${selected}`} />
          <small>{Math.ceil(state.countdown)===3 ? state.arena.name.toUpperCase() : Math.ceil(state.countdown)===2 ? 'PREPARE O PAVIO' : 'VALE A FAIXA!'}</small>
          <strong key={Math.ceil(state.countdown)}>{Math.ceil(state.countdown)}</strong>
          <span>{ch.name} · {ch.special}</span>
          <div className="countdown-track"><i style={{transform:`scaleX(${1-state.countdown/3})`}} /></div>
        </div>
      )}
      {playing && state.countdown===0 && state.invasion.stage!=='arrival' && state.equipment.time>0 && (
        <div className={`equipment-status ${state.picanhaTime>0?'equipment-shield':''} ${state.hypnosisReady?'gaze-ready':''}`} role="status">
          <img src={state.equipment.icon} alt="" width="48" height="48"/>
          <div><strong>{state.equipment.name.toUpperCase()}</strong><span>{state.equipment.action}{!state.chairReady&&` · ${state.equipment.time.toFixed(1)}s`}</span></div>
        </div>
      )}
      {playing&&state.picanhaTime>0&&<div className="picanha-aura" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span><span>✦</span></div>}
      {!menu&&state.poisonTime>0&&<><div className="poison-haze" aria-hidden="true"/><div className="poison-status" role="status"><b>NÉVOA VERDE · {Math.ceil(state.poisonTime)}s</b><span>{state.antidotes}/{state.antidoteTotal} ANTÍDOTOS · BOLSONARO IMUNE</span><small>UMA DOSE SURPRESA TRANSFORMA EM JACARÉ</small></div></>}
      {playing&&state.speechTime>0&&<section className="speech-caption" aria-label="Pronunciamento global"><small>ESPECIAL GLOBAL · CENA SATÍRICA</small><strong>“NÃO VAI TER VACINA!”</strong><span>Prepare-se para a corrida pelo antídoto.</span></section>}
      {playing&&state.flying&&state.invasion.stage!=='arrival'&&<section className="vampire-picker" aria-label="Escolher rival para morder"><header><b>VOO INVULNERÁVEL · {Math.ceil(state.vampireTime)}s</b><span>WASD · VOAR / ESPAÇO ↑ CTRL ↓ / Q · ALVO / E · MORDER</span></header><div className="vampire-targets">{state.vampireTargets.map(a=><button key={a.id} disabled={state.diving} aria-label={`Morder ${cast[a.skin].name}`} aria-pressed={state.vampireTarget===a.id} onClick={()=>api.current?.diveTarget(a.id)}><div className={`portrait portrait-${a.skin}`} aria-hidden="true"/><span>{cast[a.skin].name}</span><meter min="0" max="3" value={Math.min(3,a.hp)} aria-label={`${cast[a.skin].name}: ${a.hp.toFixed(1)} vidas`}/></button>)}</div><div className="flight-height"><button aria-label="Subir voando" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);api.current?.key('Space',true);}} onPointerUp={()=>api.current?.key('Space',false)} onPointerCancel={()=>api.current?.key('Space',false)}>↑ SUBIR</button><button aria-label="Descer voando" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);api.current?.key('ControlLeft',true);}} onPointerUp={()=>api.current?.key('ControlLeft',false)} onPointerCancel={()=>api.current?.key('ControlLeft',false)}>↓ DESCER</button></div></section>}
      {playing&&state.draining.length>0&&<div className="drain-status" role="status">{state.draining.map(d=><div key={d.id}><b>🦇 {cast[d.skin].name} · DRENANDO</b><meter min="0" max="3" value={Math.min(3,d.hp)}/><span>{d.hp.toFixed(1)} ♥</span></div>)}</div>}
      {playing&&state.hypnotized.length>0&&<div className="hypnosis-status" role="status">{state.hypnotized.map(a=><span key={a.id}>💫 {a.name} · {a.time.toFixed(1)}s</span>)}<small>HIPNOTIZADO · APROVEITE PARA LANÇAR A BOMBA</small></div>}
      {playing && state.holding && (
        <div className={`cook-hud ${state.fuse < 1 ? 'critical' : ''}`}>
          <div>
            <Bomb size={20} />
            <strong>
              {state.fuse.toFixed(2)}
              <small>s</small>
            </strong>
            <span>{state.fuse < 1 ? 'SOLTE AGORA!' : 'PAVIO ACESO'}</span>
          </div>
          <div className="fuse-track">
            <i style={{ width: `${(state.fuse / 3) * 100}%` }} />
          </div>
          <p>SOLTE PARA ARREMESSAR · MOUSE PARA CURVAR</p>
          <span className="throw-power">
            FORÇA {Math.round(state.power * 100)}%
          </span>
        </div>
      )}
      {state.phase === 'spectating' && (
        <div className="spectator-banner">
          <strong>VOCÊ FOI ELIMINADO</strong>
          <span>
            Acompanhe a disputa pela faixa · {state.enemies} sobreviventes
          </span>
          <button onClick={() => api.current?.menu()}>Voltar à seleção</button>
        </div>
      )}
      {state.phase === 'paused' && (
        <div className="modal-shade">
          <section className="game-modal">
            <small>O CAOS PODE ESPERAR</small>
            <h2>
              INTERVALO
              <br />
              DO CIRCO.
            </h2>
            <p>Retome a arena para continuar a partida.</p>
            <div className="aim-settings">
              <label id="sensitivity-label">
                Sensibilidade do mouse{' '}
                <strong>{sensitivity.toFixed(2)}×</strong>
              </label>
              <Slider
                aria-labelledby="sensitivity-label"
                min={0.25}
                max={2.5}
                step={0.05}
                value={[sensitivity]}
                onValueChange={(v) => {
                  const value = Array.isArray(v) ? v[0] : v;
                  setSensitivity(value);
                  api.current?.sensitivity(value);
                }}
              />
              <small>Movimento direto · câmera sem balanço lateral</small>
            </div>
            <button
              className="play-button"
              onClick={() => api.current?.resume()}
            >
              VOLTAR PRO CAOS <ArrowRight />
            </button>
            <button className="text-button" onClick={() => api.current?.menu()}>
              Escolher outro personagem
            </button>
          </section>
        </div>
      )}
      {(state.phase === 'won' ||
        state.phase === 'lost' ||
        state.phase === 'draw') && (
        <div className="modal-shade">
          <section className="game-modal result">
            <Trophy className="trophy" />
            <small>
              {state.winner >= 0 ? 'RESULTADO DA ELEIÇÃO' : 'SEM SOBREVIVENTES'}
            </small>
            <h2>
              {state.teamMode&&state.winnerTeam?`${state.winnerTeam==='left'?'ESQUERDA':'DIREITA'} VENCEU!`:state.winner >= 0
                ? `${cast[state.winner]?.name.toUpperCase()} ELEITO!`
                : 'ELEIÇÃO ANULADA!'}
            </h2>
            {state.winner >= 0 && (
              <div
                className={`winner-portrait portrait portrait-${state.winner}`}
              >
                <span className="presidential-sash">ELEITO</span>
              </div>
            )}
            <p>
              {state.teamMode&&state.winnerTeam?(state.phase==='won'?'Sua equipe levou a faixa!':'A equipe rival levou a faixa. Prepare a revanche.'):state.phase === 'won'
                ? 'A faixa é sua. Último sobrevivente, presidente do circo!'
                : state.winner >= 0
                  ? 'Seu rival ficou com a faixa. O próximo mandato pode ser seu.'
                  : 'Todo mundo explodiu. Ninguém leva a faixa desta vez.'}
            </p>
            <div className="result-stats">
              <div>
                <strong>{state.score}</strong>
                <small>PONTOS</small>
              </div>
              <div>
                <strong>{state.kills}</strong>
                <small>RIVAIS ELIMINADOS</small>
              </div>
            </div>
            <button className="play-button" onClick={start}>
              <RotateCcw /> MAIS UMA PARTIDA
            </button>
            <button className="text-button" onClick={() => api.current?.menu()}>
              Trocar de personagem
            </button>
          </section>
        </div>
      )}
      {help && (
        <div className="modal-shade">
          <section className={`game-modal help-modal help-page-${helpPage}`}>
            <button
              className="close-modal icon-button"
              aria-label="Fechar instruções"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <small>MANUAL DO CAOS</small>
            <h2>{['CONTROLES','COMO VENCER','AJUSTES','CRÉDITOS'][helpPage]}</h2>
            <div className="help-content">
            <div className="help-rules" hidden={helpPage!==1}>
            <p>
              Seja o último sobrevivente para ser eleito. Após 3 minutos, começa
              a morte súbita. A explosão se espalha em cruz. Paredes param o
              fogo; caixotes viram confete.
            </p>
            </div>
            <div hidden={helpPage!==0}>
            <div className="key-guide">
              {[
                ['W A S D', 'Mover'],
                ['MOUSE', 'Olhar ao redor'],
                ['SEGURE', 'Acender e mirar a bomba'],
                ['SOLTE', 'Arremessar com o pavio restante'],
                ['ESPAÇO', 'Plantar bomba'],
                ['SHIFT', 'Correr'],
                ['E', 'Especial'],
                ['ESC / P', 'Pausar'],
                ['Q', 'Soltar o bordão'],
              ].map(([key, desc]) => (
                <span key={key}>
                  <kbd>{key}</kbd>
                  {desc}
                </span>
              ))}
            </div>
            <p className="touch-help">No celular: direcional para andar; arraste a arena para mirar. Segure a bomba e solte para lançar. Os botões também permitem correr, plantar, usar o especial e soltar o bordão.</p>
            </div>
            <p className="hint" hidden={helpPage!==1}>
              O pavio dura 3 segundos desde o primeiro clique. Segurar não
              reinicia a contagem: a bomba explode na sua mão! A seta prevê a
              curva e os ricochetes. Mire para cima para passar sobre os blocos.
              Suas bombas também machucam. Saia da cruz! Pegue cristais para
              recuperar vida, escudo e alcance. No celular, arraste o lado
              direito para mirar.
            </p>
            {helpPage===2&&<div className="aim-settings">
              <label id="sensitivity-label">
                Sensibilidade do mouse{' '}
                <strong>{sensitivity.toFixed(2)}×</strong>
              </label>
              <Slider
                aria-labelledby="sensitivity-label"
                min={0.25}
                max={2.5}
                step={0.05}
                value={[sensitivity]}
                onValueChange={(v) => {
                  const value = Array.isArray(v) ? v[0] : v;
                  setSensitivity(value);
                  api.current?.sensitivity(value);
                }}
              />
              <small>Movimento direto · câmera sem balanço lateral</small>
            </div>
            }
            <div className="credits" hidden={helpPage!==3}>
              <strong>Uma sátira em forma de fliperama.</strong>
              <p>
                Personagens caricatos e habilidades fictícias. Falas históricas
                por voz sintética do navegador, sem imitação das vozes reais.
              </p>
              <div>
                {cast.map((c) => (
                  <a
                    key={c.name}
                    href={c.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fonte: {c.name} ↗
                  </a>
                ))}
              </div>
              <span>
                Motor: Three.js · Personagens voxel gerados por IA · Som original
                sintetizado
              </span>
            </div>
            </div>
            <nav className="help-pagination" aria-label="Páginas do manual"><button disabled={helpPage===0} onClick={()=>setHelpPage(p=>p-1)}>← ANTERIOR</button><span>{helpPage+1} / 4</span><button disabled={helpPage===3} onClick={()=>setHelpPage(p=>p+1)}>PRÓXIMA →</button></nav>
            <button className="play-button" onClick={() => setHelp(false)}>
              ENTENDI. BORA.
            </button>
          </section>
        </div>
      )}
      {error && (
        <div className="error-panel" role="alert">
          <strong>Não foi possível abrir a arena</strong>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      )}
    </main>
  );
}
