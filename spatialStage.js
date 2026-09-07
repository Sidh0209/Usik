// Usik Interactive 3D Spatial Audio Stage
// Lets user position audio source around virtual listener with real-time HRTF binaural panning

export class SpatialStage {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audioEngine = audioEngine;

    // Stage dimensions
    this.width = 400;
    this.height = 360;

    // Audio Source coordinates relative to center (normalized -1 to 1)
    this.sourcePos = { x: 0, y: -0.7, z: -0.5 };
    this.isDragging = false;
    this.isOrbiting = false;
    this.orbitAngle = 0;
    this.orbitSpeed = 0.02;

    this.accentColor = "#6366f1";
    this.pulse = 0;

    this.isActive = true;
    this.initCanvasSize();
    this.initInteractions();
    this.render = this.render.bind(this);
  }

  start() {
    if (!this.isActive) {
      this.isActive = true;
      requestAnimationFrame(this.render);
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

  setAccentColor(color) {
    this.accentColor = color;
  }

  initInteractions() {
    const getPosFromEvent = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;

      const cx = this.width / 2;
      const cy = this.height / 2;
      const radiusLimit = Math.min(cx, cy) * 0.85;

      const dx = rawX - cx;
      const dy = rawY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const normDist = Math.min(1, dist / radiusLimit);
      const angle = Math.atan2(dy, dx);

      return {
        x: Math.cos(angle) * normDist,
        y: Math.sin(angle) * normDist,
        z: -0.5 // Standard depth plane
      };
    };

    const onStart = (e) => {
      const pos = getPosFromEvent(e);
      const cx = this.width / 2;
      const cy = this.height / 2;
      const maxR = Math.min(cx, cy) * 0.85;

      // Source point in canvas coordinates
      const sx = cx + this.sourcePos.x * maxR;
      const sy = cy + this.sourcePos.y * maxR;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = this.canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      // Check proximity to source orb or click to jump
      const d = Math.hypot(mx - sx, my - sy);
      if (d < 45 || true) {
        this.isDragging = true;
        this.isOrbiting = false;
        this.updateSource(pos.x, pos.y);
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const pos = getPosFromEvent(e);
      this.updateSource(pos.x, pos.y);
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    this.canvas.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }

  updateSource(x, y) {
    this.sourcePos.x = x;
    this.sourcePos.y = y;
    // Map stage X, Y to 3D Audio space
    // x: left (-1) to right (+1)
    // y: front (-1) to back (+1) -> audio z
    this.audioEngine.setSpatialPosition(x * 2, 0, y * 2);

    const event = new CustomEvent("spatialCoordChange", {
      detail: { x: this.sourcePos.x.toFixed(2), y: this.sourcePos.y.toFixed(2) }
    });
    window.dispatchEvent(event);
  }

  setPreset(preset) {
    this.isOrbiting = false;
    switch (preset) {
      case "direct":
        this.updateSource(0, -0.6);
        break;
      case "wide":
        this.updateSource(0.7, -0.2);
        break;
      case "surround":
        this.updateSource(0, 0.75);
        break;
      case "orbit":
        this.isOrbiting = true;
        break;
    }
  }

  render() {
    if (!this.isActive) return;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(cx, cy) * 0.85;

    this.ctx.clearRect(0, 0, w, h);

    // Orbit animation if active
    if (this.isOrbiting) {
      this.orbitAngle += this.orbitSpeed;
      const ox = Math.cos(this.orbitAngle) * 0.75;
      const oy = Math.sin(this.orbitAngle) * 0.75;
      this.updateSource(ox, oy);
    }

    this.pulse += 0.04;
    const isPlaying = this.audioEngine.isPlaying;
    const freqData = this.audioEngine.getFrequencyData();
    const bass = freqData.length ? (freqData[2] || 0) / 255 : 0.2;

    // 1. Draw 3D Binaural Grid / Radar Rings
    for (let i = 1; i <= 3; i++) {
      const r = (maxRadius / 3) * i;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([4, 6]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Crosshairs
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - maxRadius);
    this.ctx.lineTo(cx, cy + maxRadius);
    this.ctx.moveTo(cx - maxRadius, cy);
    this.ctx.lineTo(cx + maxRadius, cy);
    this.ctx.stroke();

    // Directional Labels (Front, Left, Right, Behind)
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    this.ctx.font = "10px Inter, system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("FRONT", cx, cy - maxRadius - 10);
    this.ctx.fillText("REAR", cx, cy + maxRadius + 16);
    this.ctx.textAlign = "left";
    this.ctx.fillText("R", cx + maxRadius + 10, cy + 3);
    this.ctx.textAlign = "right";
    this.ctx.fillText("L", cx - maxRadius - 10, cy + 3);

    // 2. Draw Listener Avatar (Virtual Head) in Center
    const headRadius = 18;
    this.ctx.save();
    // Head glow
    const headGlow = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, headRadius * 2);
    headGlow.addColorStop(0, "rgba(255, 255, 255, 0.25)");
    headGlow.addColorStop(1, "transparent");
    this.ctx.fillStyle = headGlow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, headRadius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Head base
    this.ctx.fillStyle = "rgba(30, 35, 55, 0.85)";
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, headRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Headphones icon indicator on head
    this.ctx.fillStyle = this.accentColor;
    this.ctx.beginPath();
    this.ctx.arc(cx - headRadius, cy, 4, 0, Math.PI * 2);
    this.ctx.arc(cx + headRadius, cy, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Nose direction pointer (pointing to Front)
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - headRadius + 3);
    this.ctx.lineTo(cx, cy - headRadius - 4);
    this.ctx.stroke();
    this.ctx.restore();

    // 3. Draw Audio Ray between Listener & Source
    const sx = cx + this.sourcePos.x * maxRadius;
    const sy = cy + this.sourcePos.y * maxRadius;

    this.ctx.save();
    const rayGrad = this.ctx.createLinearGradient(cx, cy, sx, sy);
    rayGrad.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    rayGrad.addColorStop(1, this.accentColor + "aa");
    this.ctx.strokeStyle = rayGrad;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(sx, sy);
    this.ctx.stroke();
    this.ctx.restore();

    // 4. Draw Sound Propagation Waves from Source Orb
    if (isPlaying) {
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        const waveProgress = ((this.pulse * 0.7 + w * 0.33) % 1);
        const waveRadius = 16 + waveProgress * 45;
        const waveAlpha = (1 - waveProgress) * (0.4 + bass * 0.5);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, waveRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.accentColor;
        this.ctx.globalAlpha = waveAlpha;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 5. Draw Draggable Spatial Sound Orb
    const orbRadius = 14 + (bass * 5);
    this.ctx.save();
    // Orb glow
    const orbGlow = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, orbRadius * 2.5);
    orbGlow.addColorStop(0, this.accentColor + "dd");
    orbGlow.addColorStop(1, "transparent");
    this.ctx.fillStyle = orbGlow;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, orbRadius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Orb body
    this.ctx.fillStyle = "#ffffff";
    this.ctx.shadowColor = this.accentColor;
    this.ctx.shadowBlur = 18;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, orbRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Speaker icon or sound dot inside
    this.ctx.fillStyle = this.accentColor;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    requestAnimationFrame(this.render);
  }
}
