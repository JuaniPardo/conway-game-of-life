import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';

type Mode = 'step' | 'auto';
const PRESET_SIZES = [24, 40, 64];
const SPEEDS = [2, 10, 100] as const;

function makeGrid(size: number, random = true): boolean[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (random ? Math.random() < 0.28 : false)),
  );
}

function neighbors(grid: boolean[][], x: number, y: number): number {
  const size = grid.length;
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = (x + dx + size) % size;
      const ny = (y + dy + size) % size;
      if (grid[nx][ny]) count++;
    }
  }
  return count;
}

function nextGrid(grid: boolean[][]): boolean[][] {
  return grid.map((row, x) =>
    row.map((alive, y) => {
      const n = neighbors(grid, x, y);
      return alive ? n === 2 || n === 3 : n === 3;
    }),
  );
}

export function App() {
  const [size, setSize] = useState(40);
  const [customSize, setCustomSize] = useState('');
  const [mode, setMode] = useState<Mode>('step');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [grid, setGrid] = useState<boolean[][]>(() => makeGrid(40));

  const canvasRef = useRef<HTMLDivElement>(null);
  const pixiRef = useRef<{ app: Application; cells: Graphics[] } | null>(null);
  const loopRef = useRef<number | null>(null);

  const animMs = useMemo(() => (mode === 'auto' ? Math.max(70, 520 / speed) : 320), [mode, speed]);

  const buildPixi = (newSize: number, gridData: boolean[][]) => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = '';
    const containerSize = Math.min(window.innerWidth * 0.75, window.innerHeight * 0.8, 920);
    const app = new Application();
    app.init({ width: containerSize, height: containerSize, background: 0x0e1320, antialias: true }).then(() => {
      canvasRef.current?.appendChild(app.canvas);
      const cells: Graphics[] = [];
      const gap = 1;
      const cellSize = (containerSize - gap * (newSize - 1)) / newSize;
      for (let x = 0; x < newSize; x++) {
        for (let y = 0; y < newSize; y++) {
          const g = new Graphics();
          g.rect(y * (cellSize + gap), x * (cellSize + gap), cellSize, cellSize);
          g.fill(gridData[x][y] ? 0xa8b7d8 : 0x2a3140);
          app.stage.addChild(g);
          cells.push(g);
        }
      }
      pixiRef.current = { app, cells };
    });
  };

  const paintTransition = (prev: boolean[][], next: boolean[][]) => {
    const pixi = pixiRef.current;
    if (!pixi) return;
    const colors = {
      alive: 0xa8b7d8,
      dead: 0x2a3140,
      dying: 0xff5370,
      reviving: 0x5ba7ff,
    };

    next.forEach((row, x) => {
      row.forEach((alive, y) => {
        const idx = x * next.length + y;
        const cell = pixi.cells[idx];
        const from = prev[x][y];
        let color = alive ? colors.alive : colors.dead;
        if (from && !alive) color = colors.dying;
        if (!from && alive) color = colors.reviving;
        cell.clear();
        const containerSize = pixi.app.renderer.width;
        const gap = 1;
        const cellSize = (containerSize - gap * (next.length - 1)) / next.length;
        cell.rect(y * (cellSize + gap), x * (cellSize + gap), cellSize, cellSize);
        cell.fill(color);
      });
    });

    window.setTimeout(() => {
      const p = pixiRef.current;
      if (!p) return;
      next.forEach((row, x) => {
        row.forEach((alive, y) => {
          const idx = x * next.length + y;
          const cell = p.cells[idx];
          const containerSize = p.app.renderer.width;
          const gap = 1;
          const cellSize = (containerSize - gap * (next.length - 1)) / next.length;
          cell.clear();
          cell.rect(y * (cellSize + gap), x * (cellSize + gap), cellSize, cellSize);
          cell.fill(alive ? colors.alive : colors.dead);
        });
      });
    }, animMs);
  };

  const doStep = () => {
    setGrid((prev) => {
      const next = nextGrid(prev);
      paintTransition(prev, next);
      return next;
    });
  };

  useEffect(() => {
    buildPixi(size, grid);
    return () => {
      pixiRef.current?.app.destroy(true, { children: true });
      pixiRef.current = null;
    };
  }, [size]);

  useEffect(() => {
    if (mode !== 'auto') {
      if (loopRef.current) window.clearInterval(loopRef.current);
      loopRef.current = null;
      return;
    }
    const interval = Math.max(90, 900 / speed);
    loopRef.current = window.setInterval(doStep, interval);
    return () => {
      if (loopRef.current) window.clearInterval(loopRef.current);
      loopRef.current = null;
    };
  }, [mode, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'step') {
        e.preventDefault();
        doStep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const applySize = (value: number) => {
    const parsed = Math.floor(value);
    if (!Number.isFinite(parsed) || parsed < 8 || parsed > 180) return;
    const fresh = makeGrid(parsed);
    setSize(parsed);
    setGrid(fresh);
  };

  return (
    <main className="app">
      <motion.header className="panel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <h1>Juego de la Vida · Conway</h1>

        <div className="controls">
          <section className="control-group">
            <label>Tamaño de grilla</label>
            <div className="row">
              {PRESET_SIZES.map((s) => (
                <button key={s} className={size === s ? 'active' : ''} onClick={() => applySize(s)}>{s}×{s}</button>
              ))}
            </div>
            <div className="row">
              <input value={customSize} onChange={(e) => setCustomSize(e.target.value)} type="number" min={8} max={180} placeholder="Tamaño personalizado" />
              <button onClick={() => applySize(Number(customSize))}>Aplicar</button>
            </div>
          </section>

          <section className="control-group">
            <label>Modo</label>
            <div className="row">
              <button className={mode === 'step' ? 'active' : ''} onClick={() => setMode('step')}>Step by step</button>
              <button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>Automático</button>
            </div>
            <p>{mode === 'step' ? 'Step by step: presioná Espacio.' : 'Automático: el juego avanza solo.'}</p>
          </section>

          <section className="control-group" aria-disabled={mode !== 'auto'}>
            <label>Velocidad</label>
            <div className="row">
              {SPEEDS.map((s) => (
                <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>x{s}</button>
              ))}
            </div>
          </section>
        </div>

        <div className="row">
          <button onClick={() => setGrid(makeGrid(size))}>Aleatorio</button>
          <button onClick={() => setGrid(makeGrid(size, false))}>Limpiar</button>
        </div>
      </motion.header>

      <section className="viewer">
        <div ref={canvasRef} className="board" />
      </section>
    </main>
  );
}
