import { useEffect, useRef } from "react";
import "./App.css";

const WORDS = [
  "Forever Yours",
  "I Love You",
  "You Are My Universe",
  "Love You Always",
];

function App() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const scene = {
      width: 0,
      height: 0,
      stars: [],
      hearts: [],
      bursts: [],
      frame: 0,
      messageIndex: 0,
    };

    sceneRef.current = scene;

    let raf;
    let lastTime = 0;

    const random = (min, max) => Math.random() * (max - min) + min;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      scene.width = window.innerWidth;
      scene.height = window.innerHeight;

      canvas.width = Math.round(scene.width * dpr);
      canvas.height = Math.round(scene.height * dpr);
      canvas.style.width = `${scene.width}px`;
      canvas.style.height = `${scene.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      scene.stars = Array.from(
        {
          length: Math.min(
            240,
            Math.floor((scene.width * scene.height) / 3000),
          ),
        },
        () => ({
          x: random(0, scene.width),
          y: random(0, scene.height),
          r: random(0.3, 1.3),
          phase: random(0, Math.PI * 2),
          speed: random(0.5, 2),
          color: Math.random() > 0.8 ? "#9ccaff" : "#ffffff",
        }),
      );

      scene.hearts = Array.from({ length: 40 }, () => ({
        x: random(0, scene.width),
        y: random(0, scene.height),
        size: random(4, 10),
        phase: random(0, Math.PI * 2),
        speed: random(0.6, 1.8),
        color: ["#1478ff", "#63b5ff", "#e68cff", "#ffffff"][
          Math.floor(random(0, 4))
        ],
      }));
    }

    function drawHeart(x, y, size, color, alpha = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 16, size / 16);
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 12;
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
      const particles = [];
      const count = 260;
      const scale = Math.min(scene.width * 0.008, scene.height * 0.011, 6);

      // Sample the outline of a mathematical heart.
      for (let i = 0; i < count; i++) {
        const t = (Math.PI * 2 * i) / count;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);

        const targetX = hx * scale;
        const targetY = -hy * scale;

        // A few particles start outside the outline for a firework effect.
        const spread = Math.random() < 0.23 ? random(1.05, 1.65) : 1;

        particles.push({
          angle: t,
          targetX: targetX * spread,
          targetY: targetY * spread,
          startX: random(-12, 12),
          startY: random(-12, 12),
          delay: random(0, 0.3),
          size: random(0.7, 2.1),
          color: [
            "#1680ff",
            "#42a5ff",
            "#8acbff",
            "#d9eaff",
            "#e88cff",
            "#ffffff",
          ][Math.floor(random(0, 6))],
          phase: random(0, 7),
        });
      }

      // Fine sparks around the heart.
      const sparks = Array.from({ length: 90 }, () => {
        const angle = random(0, Math.PI * 2);
        const distance = random(35, 125);

        return {
          angle,
          distance,
          size: random(0.5, 1.8),
          color: Math.random() > 0.5 ? "#258bff" : "#b9dfff",
          delay: random(0, 0.5),
        };
      });

      scene.bursts.push({
        x,
        y,
        start: performance.now(),
        message,
        particles,
        sparks,
        duration: 5000,
      });

      if (scene.bursts.length > 4) {
        scene.bursts.shift();
      }
    }

    function draw(now) {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.04) : 0;
      lastTime = now;
      scene.frame += dt;

      ctx.clearRect(0, 0, scene.width, scene.height);

      // Deep black-blue background.
      ctx.fillStyle = "#02030d";
      ctx.fillRect(0, 0, scene.width, scene.height);

      // Twinkling distant stars.
      for (const star of scene.stars) {
        const alpha =
          0.25 + (Math.sin(scene.frame * star.speed + star.phase) + 1) * 0.35;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Glowing heart-shaped stars.
      for (const heart of scene.hearts) {
        const pulse =
          0.7 + (Math.sin(scene.frame * heart.speed + heart.phase) + 1) * 0.3;

        drawHeart(heart.x, heart.y, heart.size * pulse, heart.color, 0.9);
      }

      const activeBursts = [];

      for (const burst of scene.bursts) {
        const elapsed = now - burst.start;
        const progress = Math.min(elapsed / burst.duration, 1);
        const fade = Math.min(1, (1 - progress) * 4);
        const appear = Math.min(1, elapsed / 900);

        if (progress >= 1) continue;
        activeBursts.push(burst);

        // Outer blue sparkle cloud.
        for (const spark of burst.sparks) {
          const local = Math.max(0, progress - spark.delay * 0.2);
          const distance = spark.distance * (0.35 + local * 0.75);
          const wobble = Math.sin(scene.frame * 3 + spark.angle) * 3;

          ctx.globalAlpha = fade * 0.7;
          ctx.fillStyle = spark.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = spark.color;

          ctx.beginPath();
          ctx.arc(
            burst.x + Math.cos(spark.angle) * (distance + wobble),
            burst.y + Math.sin(spark.angle) * (distance + wobble),
            spark.size,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        // Particles fly from the click point into a heart outline.
        for (const p of burst.particles) {
          const localProgress = Math.max(
            0,
            Math.min(1, (progress - p.delay * 0.5) / 0.35),
          );

          const ease = 1 - Math.pow(1 - localProgress, 3);

          const px = burst.x + p.startX + p.targetX * ease;
          const py = burst.y + p.startY + p.targetY * ease;

          const shimmer = 0.65 + 0.35 * Math.sin(scene.frame * 5 + p.phase);

          ctx.globalAlpha = fade * shimmer;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Message appears inside the particle heart.
        if (appear > 0.4) {
          const textAlpha = Math.min(1, (appear - 0.4) * 2.5) * fade;
          const fontSize = Math.max(13, Math.min(18, scene.width * 0.027));

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `500 ${fontSize}px Arial, sans-serif`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#64aaff";
          ctx.fillStyle = `rgba(225, 239, 255, ${textAlpha})`;

          ctx.fillText(burst.message, burst.x - 4, burst.y - 8);

          ctx.fillText("I Love You", burst.x + 4, burst.y + 25);

          ctx.shadowBlur = 0;
        }
      }

      scene.bursts = activeBursts;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    function handleClick(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const message = WORDS[scene.messageIndex % WORDS.length];
      scene.messageIndex++;

      makeBurst(x, y, message);
    }

    resize();

    // Start with a small particle heart in the middle, like the reference.
    makeBurst(scene.width * 0.5, scene.height * 0.48, WORDS[0]);

    canvas.addEventListener("pointerdown", handleClick);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", handleClick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main className="love-universe">
      <canvas
        ref={canvasRef}
        className="particle-canvas"
        aria-label="Interactive night sky. Click anywhere to send a heart."
      />

      <div className="sky-instruction">
        <span className="instruction-icon">♡</span>
        Click anywhere to send heart
      </div>
    </main>
  );
}

export default App;
