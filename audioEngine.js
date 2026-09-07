// Usik Spatial Audio Engine
// Combines Web Audio API, 3D Binaural Spatial Panning, Analyser, and Generative Fallback

export class SpatialAudioEngine {
  constructor() {
    this.audioContext = null;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.audioElement.preload = "auto";

    this.sourceNode = null;
    this.analyser = null;
    this.panner = null;
    this.stereoPanner = null;
    this.gainNode = null;
    this.bassFilter = null;

    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 0.85;
    this.currentTrack = null;
    this.isSynthetic = false;
    this.synthLoopId = null;
    this.synthNodes = [];

    // Spatial coordinates: listener at (0, 0, 0), source at (x, y, z)
    this.spatialPos = { x: 0, y: 0, z: -1 };

    this.callbacks = {
      onTimeUpdate: () => {},
      onTrackEnd: () => {},
      onStateChange: () => {},
      onError: () => {}
    };

    this.initAudioElementEvents();
  }

  ensureContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Master Gain
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      // Bass / Tone Filter
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.value = 250;
      this.bassFilter.gain.value = 3; // Warm spatial low-end boost

      // Analyser for real-time spatial visualizer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      // 3D Panner Node (for true spatial stage)
      if (this.audioContext.createPanner) {
        this.panner = this.audioContext.createPanner();
        this.panner.panningModel = "HRTF"; // Head-Related Transfer Function for binaural 3D
        this.panner.distanceModel = "inverse";
        this.panner.refDistance = 1;
        this.panner.maxDistance = 10000;
        this.panner.rolloffFactor = 1;
        this.panner.coneInnerAngle = 360;
        this.updatePannerPosition();
      }

      // Stereo Panner fallback
      if (this.audioContext.createStereoPanner) {
        this.stereoPanner = this.audioContext.createStereoPanner();
        this.stereoPanner.pan.value = 0;
      }

      // Setup Web Audio graph for Audio Element
      try {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.connectNodes(this.sourceNode);
      } catch (err) {
        console.warn("MediaElementAudioSourceNode creation warning:", err);
      }
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  connectNodes(inputNode) {
    // Chain: Input -> Filter -> Panner (if available) -> Gain -> Analyser -> Destination
    let current = inputNode;
    current.connect(this.bassFilter);
    current = this.bassFilter;

    if (this.panner) {
      current.connect(this.panner);
      current = this.panner;
    } else if (this.stereoPanner) {
      current.connect(this.stereoPanner);
      current = this.stereoPanner;
    }

    current.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  initAudioElementEvents() {
    this.audioElement.addEventListener("timeupdate", () => {
      if (!this.isSynthetic && this.isPlaying) {
        this.callbacks.onTimeUpdate(this.audioElement.currentTime, this.audioElement.duration || 1);
      }
    });

    this.audioElement.addEventListener("ended", () => {
      this.callbacks.onTrackEnd();
    });

    this.audioElement.addEventListener("error", (e) => {
      console.warn("Remote audio stream failed to load, switching to High-Fidelity Generative Spatial Synth fallback:", e);
      this.startSyntheticTrack();
    });
  }

  setSpatialPosition(x, y, z) {
    this.spatialPos = { x, y, z };
    this.updatePannerPosition();
  }

  updatePannerPosition() {
    if (!this.audioContext) return;
    const { x, y, z } = this.spatialPos;
    const now = this.audioContext.currentTime;

    if (this.panner) {
      if (this.panner.positionX) {
        this.panner.positionX.setTargetAtTime(x * 3, now, 0.05);
        this.panner.positionY.setTargetAtTime(y * 3, now, 0.05);
        this.panner.positionZ.setTargetAtTime(z * 3, now, 0.05);
      } else {
        this.panner.setPosition(x * 3, y * 3, z * 3);
      }
    }

    if (this.stereoPanner) {
      const clampedX = Math.max(-1, Math.min(1, x));
      this.stereoPanner.pan.setTargetAtTime(clampedX, now, 0.05);
    }
  }

  async loadTrack(track) {
    this.ensureContext();
    this.stopSyntheticTrack();
    this.currentTrack = track;
    this.isSynthetic = false;

    try {
      this.audioElement.src = track.audioUrl;
      this.audioElement.load();
      await this.play();
    } catch (err) {
      console.warn("Audio load error, fallback to synthetic ambient generator:", err);
      this.startSyntheticTrack();
    }
  }

  async play() {
    this.ensureContext();
    if (this.isSynthetic) {
      this.isPlaying = true;
      this.callbacks.onStateChange(true);
      return;
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
      this.callbacks.onStateChange(true);
    } catch (err) {
      console.warn("Direct play blocked or interrupted, using synth mode:", err);
      this.startSyntheticTrack();
    }
  }

  pause() {
    if (this.isSynthetic) {
      this.isPlaying = false;
      this.stopSyntheticTrack(false);
      this.callbacks.onStateChange(false);
      return;
    }

    this.audioElement.pause();
    this.isPlaying = false;
    this.callbacks.onStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      if (this.currentTrack) {
        this.play();
      }
    }
  }

  seek(seconds) {
    if (!this.isSynthetic && !isNaN(this.audioElement.duration)) {
      this.audioElement.currentTime = Math.min(Math.max(0, seconds), this.audioElement.duration);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audioElement.volume = this.volume;
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.audioContext.currentTime, 0.03);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  // Visualizer Data Feeder
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData() {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  // Autonomous Generative Spatial Synthesizer Fallback
  // Produces warm, spatial ambient chords and subtle rhythmic pulses
  startSyntheticTrack() {
    this.ensureContext();
    this.stopSyntheticTrack();
    this.isSynthetic = true;
    this.isPlaying = true;
    this.callbacks.onStateChange(true);

    let syntheticTime = 0;
    const duration = this.currentTrack ? this.currentTrack.duration : 180;

    // Chord progressions for synthetic spatial atmosphere
    const chordSets = [
      [220, 277.18, 329.63, 415.3], // A maj7
      [196, 246.94, 293.66, 369.99], // G maj7
      [164.81, 220, 261.63, 329.63], // E min7
      [174.61, 220, 261.63, 329.63]  // F maj7
    ];
    let chordIdx = 0;

    const playChordBurst = () => {
      if (!this.isPlaying || !this.isSynthetic) return;
      const notes = chordSets[chordIdx % chordSets.length];
      chordIdx++;

      notes.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const noteGain = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now);

        // Gentle envelope
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.04, now + 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(noteGain);
        this.connectNodes(noteGain);

        osc.start(now);
        osc.stop(now + 4.0);
        this.synthNodes.push({ osc, gain: noteGain });
      });

      // Spatial shimmer
      const shimmerOsc = this.audioContext.createOscillator();
      const shimmerGain = this.audioContext.createGain();
      const sNow = this.audioContext.currentTime;
      shimmerOsc.type = "sine";
      shimmerOsc.frequency.setValueAtTime(notes[2] * 2, sNow);
      shimmerGain.gain.setValueAtTime(0, sNow);
      shimmerGain.gain.linearRampToValueAtTime(0.015, sNow + 0.4);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, sNow + 2.0);
      shimmerOsc.connect(shimmerGain);
      this.connectNodes(shimmerGain);
      shimmerOsc.start(sNow);
      shimmerOsc.stop(sNow + 2.0);
    };

    playChordBurst();
    this.synthInterval = setInterval(playChordBurst, 4000);

    // Synthetic time updater
    this.synthTimeInterval = setInterval(() => {
      if (this.isPlaying && this.isSynthetic) {
        syntheticTime += 0.5;
        this.callbacks.onTimeUpdate(syntheticTime, duration);
        if (syntheticTime >= duration) {
          this.callbacks.onTrackEnd();
        }
      }
    }, 500);
  }

  stopSyntheticTrack(reset = true) {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthTimeInterval) {
      clearInterval(this.synthTimeInterval);
      this.synthTimeInterval = null;
    }
    if (reset) {
      this.synthNodes = [];
    }
  }
}
