'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
    special: 'Onda vermelha',
    desc: 'Uma chuva de bombas na sua frente.',
    source:
      'https://www1.folha.uol.com.br/fsp/mundo/67032-bordao-de-lula-nunca-antes-na-historia-ganha-versao-em-peca-de-tv-de-chavez.shtml',
  },
  {
    name: 'Bolsonaro',
    title: 'O capitão',
    color: '#b9f346',
    quote: 'Tá ok?',
    special: 'Modo turbo',
    desc: 'Velocidade e escudo por 6 segundos.',
    source:
      'https://www1.folha.uol.com.br/poder/2019/10/esquece-o-psl-afirma-bolsonaro-ao-criticar-presidente-de-seu-partido.shtml',
  },
  {
    name: 'Dilma',
    title: 'A imprevisível',
    color: '#ffae4b',
    quote: 'Eu tô saudando a mandioca',
    special: 'Saudação à mandioca',
    desc: 'Superexplosão em cruz, com proteção.',
    source:
      'https://m.folha.uol.com.br/poder/2015/06/1646966-em-cerimonia-com-indios-dilma-sauda-mandioca-e-fala-de-mulheres-sapiens.shtml',
  },
  {
    name: 'Temer',
    title: 'O imortal',
    color: '#be95ff',
    quote: 'Não renunciarei.',
    special: 'Não renunciarei',
    desc: 'Recupere um coração e ganhe escudo.',
    source:
      'https://www.biblioteca.presidencia.gov.br/presidencia/ex-presidentes/michel-temer/discursos-do-presidente-da-republica/declaracao-a-imprensa-do-presidente-da-republica-michel-temer-brasilia-df-1',
  },
];
const initial = {
  phase: 'menu',
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
  wave: 1,
};
type Snapshot = typeof initial;
type GameApi = {
  start: (character: number, mode: string) => void;
  pause: () => void;
  resume: () => void;
  menu: () => void;
  special: () => void;
  throwBomb: () => void;
  key: (code: string, down: boolean) => void;
  mute: (value: boolean) => void;
  destroy: () => void;
};
type GameWindow = Window & {
  createBombaGame: (
    canvas: HTMLCanvasElement,
    onState: (state: Snapshot) => void,
    onError: (error: string) => void,
  ) => GameApi;
};
export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null),
    api = useRef<GameApi | null>(null);
  const [selected, select] = useState(0),
    [state, setState] = useState<Snapshot>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false),
    [mode, setMode] = useState('caos');
  useEffect(() => {
    let disposed = false;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/game/boot.js';
    script.onload = () => {
      if (disposed || !canvas.current) return;
      api.current = (window as unknown as GameWindow).createBombaGame(
        canvas.current,
        (s: Snapshot) => setState(s),
        setError,
      );
      setReady(true);
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
    api.current?.start(selected, mode);
    setHelp(false);
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return (
    <main className={`arcade ${playing ? 'is-playing' : ''}`}>
      <canvas
        ref={canvas}
        className="world"
        aria-label="Arena de bombas em primeira pessoa"
      />
      <div className="vignette" />
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Bomba Eleitoral início">
          <Bomb size={26} />
          <span>
            BOMBA<span className="brand-small">ELEITORAL</span>
          </span>
          <small>ARCADE / 3D</small>
        </Link>
        <div className="top-actions">
          <span className="live-dot" />
          <span className="top-label">CIRCO DO CAOS</span>
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
      {menu && (
        <section className="lobby">
          <div className="lobby-main">
            <div className="eyebrow">
              <span /> PRIMEIRA PESSOA. ÚLTIMO SOBREVIVENTE.
            </div>
            <h1>
              BOMBA
              <br />
              <span>
                ELEITORAL<span className="title-dot">.</span>
              </span>
            </h1>
            <p className="intro">
              O debate acabou.
              <br />
              <strong>Agora é cada um por si.</strong>
            </p>
            <div className="choose-heading">
              <span>01 / ESCOLHA SEU PERSONAGEM</span>
              <small>4 figuras. Nenhum juízo.</small>
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
            <div className="launch-row">
              <button
                className="play-button"
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
            <RadioGroup
              className="mode-select"
              value={mode}
              onValueChange={(v) => setMode(String(v))}
              aria-label="Intensidade"
            >
              <label htmlFor="mode-caos">
                <RadioGroupItem id="mode-caos" value="caos" /> Caos total{' '}
                <Flame size={14} />
              </label>
              <label htmlFor="mode-treino">
                <RadioGroupItem id="mode-treino" value="treino" /> Aquecimento
              </label>
            </RadioGroup>
          </div>
          <aside className="arena-label">
            <div className="arena-tag">
              <span /> ARENA 01
            </div>
            <h2>
              CIRCO
              <br />
              DO CAOS
            </h2>
            <p>
              Promessas voam.
              <br />
              Bombas também.
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
              <span className="status-led" /> SINGLE PLAYER · ARENA 3D
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
                  {state.shield && <Shield size={23} />}
                </div>
              </div>
            </div>
            <div className="timer">
              <small>FIM DO ESPETÁCULO</small>
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
              <span>{state.enemies} RIVAIS NA ARENA</span>
            </div>
          </div>
          <div className="crosshair">
            <span />
            <span />
          </div>
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
              <kbd>CLIQUE</kbd>
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
              disabled={state.special < 1}
            >
              <Zap />
              <span>
                {ch.special}
                <small>
                  {state.special >= 1
                    ? 'ESPECIAL PRONTO'
                    : `CARREGANDO ${Math.floor(state.special * 100)}%`}
                </small>
              </span>
              <kbd>E</kbd>
              <i style={{ width: `${state.special * 100}%` }} />
            </button>
          </div>
          <div className="controls-strip">
            W A S D <span>MOVER</span> · MOUSE <span>MIRAR</span> · CLIQUE{' '}
            <span>ARREMESSAR</span> · ESPAÇO <span>PLANTAR</span> · SHIFT{' '}
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
            <button
              className="touch-bomb"
              onPointerDown={() => api.current?.throwBomb()}
              aria-label="Arremessar bomba"
            >
              <Bomb />
            </button>
          </div>
        </>
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
      {(state.phase === 'won' || state.phase === 'lost') && (
        <div className="modal-shade">
          <section className="game-modal result">
            <Trophy className="trophy" />
            <small>
              {state.phase === 'won' ? 'O ÚLTIMO A RIR' : 'FIM DE ESPETÁCULO'}
            </small>
            <h2>{state.phase === 'won' ? 'O CIRCO É SEU.' : 'DEU RUIM.'}</h2>
            <p>
              {state.phase === 'won'
                ? 'Você sobreviveu ao debate mais explosivo do país.'
                : 'Até o caos merece uma segunda tentativa.'}
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
          <section className="game-modal help-modal">
            <button
              className="close-modal icon-button"
              aria-label="Fechar instruções"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <small>MANUAL DO CAOS</small>
            <h2>
              ACENDA.
              <br />
              ARREMESSE. CORRA.
            </h2>
            <p>
              Elimine os rivais e sobreviva por até 3 minutos. A explosão se
              espalha em cruz. Paredes param o fogo; caixotes viram confete.
            </p>
            <div className="key-guide">
              {[
                ['W A S D', 'Mover'],
                ['MOUSE', 'Olhar ao redor'],
                ['CLIQUE', 'Arremessar bomba'],
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
            <p className="hint">
              Suas bombas também machucam. Saia da cruz! Pegue cristais para
              recuperar vida, escudo e alcance. No celular, arraste o lado
              direito para mirar.
            </p>
            <div className="credits">
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
                Motor: Three.js · Retratos gerados por IA · Som original
                sintetizado
              </span>
            </div>
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
