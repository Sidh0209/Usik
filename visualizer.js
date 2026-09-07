// Usik 3D Holographic Audio Visualizer
// Renders dynamic particle spheres, frequency waves, and spatial orbital rings

export class SpatialVisualizer {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audioEngine = audioEngine;
    this.isActive = true;
    this.themeColors = { primary: "#6366f1", secondary: "#ec4899" };

    // Mouse / Parallax tracking
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    // Particle system
    this.particles = [];
    this.particleCount = 90;
    this.rotation = 0;

    this.initCanvasSize();
    this.initParticles();
    this.initEvents();
    this.animate = this.animate.bind(this);
  }

  start() {
    if (!this.isActive) {
      this.isActive = true;
      requestAnimationFrame(this.animate);
    }
  }

  stop() {
    this.isActive = false;
  }

  initCanvasSize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.width = rect.width;
      this.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 60 + Math.random() * 110;

      this.particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        baseRadius: radius,
        size: 1.5 + Math.random() * 2.5,
        speed: 0.003 + Math.random() * 0.007,
        hueOffset: Math.random() * 40 - 20
      });
    }
  }

  initEvents() {
    window.addEventListener("mousemove", (e) => {
      const { innerWidth, innerHeight } = window;
      this.targetMouseX = (e.clientX / innerWidth - 0.5) * 2;
      this.targetMouseY = (e.clientY / innerHeight - 0.5) * 2;
    });
  }

  setTheme(primary, secondary) {
    this.themeColors = { primary, secondary };
  }

  animate() {
    if (!this.isActive) return;

    // Smooth mouse lerp for 3D parallax
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.06;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.06;

    const w = this.width || 400;
    const h = this.height || 350;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);

    const freqData = this.audioEngine.getFrequencyData();
    const isPlaying = this.audioEngine.isPlaying;

    // Calculate energy bands
    let bass = 0;
    let mids = 0;
    let highs = 0;

    if (isPlaying && freqData.length > 0) {
      for (let i = 0; i < 12; i++) bass += freqData[i] || 0;
      for (let i = 12; i < 40; i++) mids += freqData[i] || 0;
      for (let i = 40; i < 80; i++) highs += freqData[i] || 0;
      bass = bass / (12 * 255);
      mids = mids / (28 * 255);
      highs = highs / (40 * 255);
    } else {
      // Idle breathing ambient pulse
      const t = Date.now() * 0.0015;
      bass = 0.12 + Math.sin(t) * 0.04;
      mids = 0.08 + Math.cos(t * 1.2) * 0.03;
      highs = 0.05 + Math.sin(t * 0.8) * 0.02;
    }

    this.rotation += 0.008 + (bass * 0.015);

    // 1. Draw central glowing ambient core
    const coreRadius = 45 + bass * 35;
    const gradient = this.ctx.createRadialGradient(
      cx + this.mouseX * 15,
      cy + this.mouseY * 15,
      0,
      cx + this.mouseX * 15,
      cy + this.mouseY * 15,
      coreRadius * 2.2
    );
    gradient.addColorStop(0, this.themeColors.secondary + "99");
    gradient.addColorStop(0.5, this.themeColors.primary + "44");
    gradient.addColorStop(1, "transparent");

    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx + this.mouseX * 15, cy + this.mouseY * 15, coreRadius * 2.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 2. Draw Spatial Orbital Hologram Rings
    const ringCount = 3;
    for (let r = 0; r < ringCount; r++) {
      const ringRadius = 70 + r * 28 + (r === 0 ? bass * 25 : mids * 20);
      const angleOffset = this.rotation * (r % 2 === 0 ? 1 : -1) + (r * Math.PI / 3);

      this.ctx.save();
      this.ctx.translate(cx + this.mouseX * 20, cy + this.mouseY * 20);
      this.ctx.rotate(angleOffset * 0.6);
      this.ctx.scale(1, 0.45 + Math.sin(this.rotation + r) * 0.1);

      this.ctx.strokeStyle = r % 2 === 0 ? this.themeColors.primary : this.themeColors.secondary;
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowColor = this.themeColors.primary;
      this.ctx.shadowBlur = 10;
      this.ctx.globalAlpha = 0.4 + (bass * 0.5);

      this.ctx.beginPath();
      this.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Node highlights along ring
      const dotAngle = this.rotation * 2 + r;
      const dx = Math.cos(dotAngle) * ringRadius;
      const dy = Math.sin(dotAngle) * ringRadius;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    // 3. Draw 3D Spatial Particles with Depth
    this.ctx.save();
    this.particles.forEach((p) => {
      // 3D rotation
      const cosY = Math.cos(this.rotation + p.speed);
      const sinY = Math.sin(this.rotation + p.speed);
      const cosX = Math.cos(this.mouseY * 0.5);
      const sinX = Math.sin(this.mouseY * 0.5);

      // Rotate around Y
      let x1 = p.x * cosY - p.z * sinY;
      let z1 = p.z * cosY + p.x * sinY;

      // Rotate around X
      let y1 = p.y * cosX - z1 * sinX;
      let z2 = z1 * cosX + p.y * sinX;

      // Frequency pulse
      const pulse = 1 + bass * 0.4;
      x1 *= pulse;
      y1 *= pulse;

      // Projection with focal length
      const fov = 320;
      const scale = fov / (fov + z2);

      const projX = cx + (x1 * scale) + (this.mouseX * 35);
      const projY = cy + (y1 * scale) + (this.mouseY * 35);

      // Depth-based opacity & size
      const alpha = Math.max(0.1, Math.min(0.95, (z2 + 150) / 300));
      const pSize = Math.max(0.8, p.size * scale * (1 + highs * 0.8));

      this.ctx.beginPath();
      this.ctx.arc(projX, projY, pSize, 0, Math.PI * 2);
      this.ctx.fillStyle = z2 > 0 ? this.themeColors.secondary : this.themeColors.primary;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowColor = this.themeColors.primary;
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
    });
    this.ctx.restore();

    // 4. Reactive Waveform Ribbon at Base
    this.drawSoundwaveRibbon(cx, h - 35, w, freqData, bass);

    requestAnimationFrame(this.animate);
  }

  drawSoundwaveRibbon(cx, cy, width, freqData, bass) {
    const bars = 48;
    const barWidth = 3;
    const spacing = 4;
    const totalW = bars * (barWidth + spacing);
    const startX = cx - totalW / 2;

    this.ctx.save();
    for (let i = 0; i < bars; i++) {
      const dataIdx = Math.floor((i / bars) * Math.min(freqData.length, 64));
      const val = (freqData[dataIdx] || 0) / 255;
      const barHeight = Math.max(4, val * 38 * (1 + bass * 0.5));
      const x = startX + i * (barWidth + spacing);

      const grad = this.ctx.createLinearGradient(0, cy - barHeight, 0, cy);
      grad.addColorStop(0, this.themeColors.primary);
      grad.addColorStop(1, this.themeColors.secondary + "44");

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(x, cy - barHeight, barWidth, barHeight, 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}
