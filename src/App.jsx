import { useEffect, useRef, useState } from "react";
import "./App.css";

// [headline inside the heart, small line beneath it]
const WORDS = [
  ["Forever Yours", "I love you"],
  ["You Are My Universe", "every star, every orbit"],
  ["Love You Always", "today and all the days after"],
  ["My Whole Heart", "it has your name on it"],
];

const POEM = [
  "Of all the stars in the sky, you are the one I look for.",
  "Wherever I am, my heart knows the way to you.",
  "You make the quiet nights feel like home.",
  "If love had a color, it would glow like this.",
];

const PALETTE = [
  "#1680ff",
  "#42a5ff",
  "#8acbff",
  "#d9eaff",
  "#f19cff",
  "#ffffff",
];

function App() {
  const canvasRef = useRef(null);
  const [poemIndex, setPoemIndex] = useState(0);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setPoemIndex((i) => (i + 1) % POEM.length),
      5200,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = {
      width: 0,
      height: 0,
      stars: [],
      hearts: [],
      bursts: [],
      meteors: [],
      t: 0,
      msg: 0,
    };
    let raf;
    let last = 0;
    let nextMeteor = 2;

    const rand = (a, b) => Math.random() * (b - a) + a;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      scene.width = window.innerWidth;
      scene.height = window.innerHeight;
      canvas.width = Math.round(scene.width * dpr);
      canvas.height = Math.round(scene.height * dpr);
      canvas.style.width = `${scene.width}px`;
      canvas.style.height = `${scene.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        260,
        Math.floor((scene.width * scene.height) / 3000),
      );
      scene.stars = Array.from({ length: count }, () => ({
        x: rand(0, scene.width),
        y: rand(0, scene.height),
        r: rand(0.3, 1.3),
        phase: rand(0, 6.28),
        speed: rand(0.5, 2),
        color: Math.random() > 0.8 ? "#9ccaff" : "#ffffff",
      }));
      scene.hearts = Array.from({ length: 36 }, () => ({
        x: rand(0, scene.width),
        y: rand(0, scene.height),
        baseY: 0,
        size: rand(4, 11),
        phase: rand(0, 6.28),
        speed: rand(0.6, 1.8),
        drift: rand(4, 14),
        color: ["#1478ff", "#63b5ff", "#e68cff", "#ffffff"][
          Math.floor(rand(0, 4))
        ],
      }));
      scene.hearts.forEach((h) => (h.baseY = h.y));
    }

    function drawHeart(x, y, size, color, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 16, size / 16);
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-14, -4, -8, -13, 0, -7);
      ctx.bezierCurveTo(8, -13, 14, -4, 0, 5);
      ctx.fill();
      ctx.restore();
    }

    function makeBurst(x, y, message) {
      const scale = Math.min(scene.width * 0.009, scene.height * 0.012, 7);
      const count = 320;
      const particles = Array.from({ length: count }, (_, i) => {
        const t = (Math.PI * 2 * i) / count;
        const hx = 16 * Math.sin(t) ** 3;
        const hy =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        const spread = Math.random() < 0.2 ? rand(1.05, 1.6) : 1;
        return {
          tx: hx * scale * spread,
          ty: -hy * scale * spread,
          sx: rand(-10, 10),
          sy: rand(-10, 10),
          delay: rand(0, 0.3),
          size: rand(0.7, 2.2),
          color: PALETTE[Math.floor(rand(0, PALETTE.length))],
          phase: rand(0, 7),
        };
      });
      // soft inner fill so the heart feels full
      const inner = Array.from({ length: 70 }, () => {
        const t = rand(0, 6.28);
        const k = Math.sqrt(Math.random()) * 0.85;
        const hx = 16 * Math.sin(t) ** 3;
        const hy =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        return {
          tx: hx * scale * k,
          ty: -hy * scale * k,
          size: rand(0.4, 1.1),
          phase: rand(0, 7),
          delay: rand(0.1, 0.4),
        };
      });
      const sparks = Array.from({ length: 100 }, () => ({
        angle: rand(0, 6.28),
        distance: rand(40, 140),
        size: rand(0.5, 1.8),
        color: Math.random() > 0.5 ? "#258bff" : "#f0b4ff",
        delay: rand(0, 0.5),
      }));
      scene.bursts.push({
        x,
        y,
        start: performance.now(),
        message,
        particles,
        inner,
        sparks,
        duration: 6000,
      });
      if (scene.bursts.length > 4) scene.bursts.shift();
    }

    function spawnMeteor() {
      const fromLeft = Math.random() > 0.5;
      scene.meteors.push({
        x: fromLeft
          ? rand(0, scene.width * 0.5)
          : rand(scene.width * 0.5, scene.width),
        y: rand(0, scene.height * 0.35),
        vx: (fromLeft ? 1 : -1) * rand(420, 620),
        vy: rand(180, 300),
        life: 0,
      });
    }

    function draw(now) {
      const dt = last ? Math.min((now - last) / 1000, 0.04) : 0;
      last = now;
      scene.t += dt;
      ctx.clearRect(0, 0, scene.width, scene.height);

      for (const s of scene.stars) {
        ctx.globalAlpha =
          0.25 + (Math.sin(scene.t * s.speed + s.phase) + 1) * 0.35;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.28);
        ctx.fill();
      }

      for (const h of scene.hearts) {
        const pulse = 0.7 + (Math.sin(scene.t * h.speed + h.phase) + 1) * 0.3;
        const y = h.baseY + Math.sin(scene.t * 0.4 + h.phase) * h.drift;
        drawHeart(h.x, y, h.size * pulse, h.color, 0.85);
      }

      // shooting stars
      if (!reduceMotion) {
        nextMeteor -= dt;
        if (nextMeteor <= 0) {
          spawnMeteor();
          nextMeteor = rand(3, 7);
        }
      }
      scene.meteors = scene.meteors.filter((m) => m.life < 1.1);
      for (const m of scene.meteors) {
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const a = Math.max(0, 1 - m.life);
        const g = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - m.vx * 0.18,
          m.y - m.vy * 0.18,
        );
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(120,180,255,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18);
        ctx.stroke();
      }

      const alive = [];
      for (const b of scene.bursts) {
        const elapsed = now - b.start;
        const p = Math.min(elapsed / b.duration, 1);
        if (p >= 1) continue;
        alive.push(b);
        const fade = Math.min(1, (1 - p) * 4);
        const appear = Math.min(1, elapsed / 900);
        // gentle heartbeat once formed
        const beat =
          p > 0.12 ? 1 + Math.max(0, Math.sin(scene.t * 3.2)) ** 6 * 0.045 : 1;

        // soft glow behind the heart
        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 150);
        glow.addColorStop(0, `rgba(60,130,255,${0.22 * fade * appear})`);
        glow.addColorStop(1, "rgba(60,130,255,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.fillRect(b.x - 150, b.y - 150, 300, 300);

        for (const s of b.sparks) {
          const local = Math.max(0, p - s.delay * 0.2);
          const d =
            s.distance * (0.35 + local * 0.75) +
            Math.sin(scene.t * 3 + s.angle) * 3;
          ctx.globalAlpha = fade * 0.7;
          ctx.fillStyle = s.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = s.color;
          ctx.beginPath();
          ctx.arc(
            b.x + Math.cos(s.angle) * d,
            b.y + Math.sin(s.angle) * d,
            s.size,
            0,
            6.28,
          );
          ctx.fill();
        }

        for (const q of b.particles) {
          const lp = Math.max(0, Math.min(1, (p - q.delay * 0.5) / 0.3));
          const e = 1 - (1 - lp) ** 3;
          ctx.globalAlpha =
            fade * (0.65 + 0.35 * Math.sin(scene.t * 5 + q.phase));
          ctx.fillStyle = q.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = q.color;
          ctx.beginPath();
          ctx.arc(
            b.x + q.sx + q.tx * e * beat,
            b.y + q.sy + q.ty * e * beat,
            q.size,
            0,
            6.28,
          );
          ctx.fill();
        }

        for (const q of b.inner) {
          const lp = Math.max(0, Math.min(1, (p - q.delay * 0.5) / 0.3));
          ctx.globalAlpha =
            fade * lp * (0.25 + 0.3 * Math.sin(scene.t * 3 + q.phase));
          ctx.fillStyle = "#8acbff";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#42a5ff";
          ctx.beginPath();
          ctx.arc(b.x + q.tx * beat, b.y + q.ty * beat, q.size, 0, 6.28);
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (appear > 0.4) {
          const ta = Math.min(1, (appear - 0.4) * 2.5) * fade;
          const size = Math.max(15, Math.min(24, scene.width * 0.034));
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowBlur = 16;
          ctx.shadowColor = "#64aaff";
          ctx.fillStyle = `rgba(235, 244, 255, ${ta})`;
          ctx.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
          ctx.fillText(b.message[0], b.x, b.y - 8);
          ctx.font = `italic 400 ${size * 0.62}px "Cormorant Garamond", Georgia, serif`;
          ctx.fillStyle = `rgba(200, 224, 255, ${ta * 0.85})`;
          ctx.fillText(b.message[1], b.x, b.y + size * 0.85);
          ctx.shadowBlur = 0;
        }
      }
      scene.bursts = alive;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    function handlePointer(e) {
      const rect = canvas.getBoundingClientRect();
      makeBurst(
        e.clientX - rect.left,
        e.clientY - rect.top,
        WORDS[scene.msg % WORDS.length],
      );
      scene.msg++;
      setSent((n) => n + 1);
    }

    resize();
    makeBurst(scene.width * 0.5, scene.height * 0.52, WORDS[0]);
    canvas.addEventListener("pointerdown", handlePointer);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main className="love-universe">
      <div className="nebula" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="particle-canvas"
        aria-label="Interactive night sky. Click anywhere to send a heart."
      />

      <header className="title-block">
        <h1 className="title">Every Star Leads to You</h1>
        <p key={poemIndex} className="poem">
          {POEM[poemIndex]}
        </p>
      </header>

      <footer className="sky-instruction">
        <span className="instruction-icon" aria-hidden="true">
          ♡
        </span>
        <span>Tap the sky to send a heart</span>
        {sent > 0 && <span className="sent-count"></span>}
      </footer>
    </main>
  );
}

export default App;
