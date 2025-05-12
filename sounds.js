export class SoundManager {
    constructor() {
        this.sounds = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain(); // General gain node for one-shot sounds
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = 0.7; // Default volume for one-shot sounds
        console.log('SoundManager initialized with audio context:', this.audioContext.state);

        this.thrustGain = null; // Specific gain for thrust loop
        this.musicGain = null;  // Specific gain for music loop

        this.thrustSource = null; // To keep track of the active thrust sound source
        this.musicSource = null;  // To keep track of the active music source
    }

    async loadSounds() {
        console.log('Loading sounds...');
        const soundFiles = {
            background: 'assets/ld_loop.ogg', // Music
            thrust: 'assets/thrust.ogg',
            crash: 'assets/crash.ogg',
            safe_land: 'assets/vo_safe_landing.ogg',
            start: 'assets/clear.ogg',
            low_fuel: 'assets/low_fuel.ogg'
        };

        try {
            for (const [name, url] of Object.entries(soundFiles)) {
                console.log(`Loading sound: ${name} from ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load ${url}: ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds[name] = audioBuffer;
                console.log(`Successfully loaded sound: ${name}`);
            }

            // Set up gain nodes for volume control of looped sounds
            this.thrustGain = this.audioContext.createGain();
            this.thrustGain.gain.value = 0.7; // 70% volume for thrust
            this.thrustGain.connect(this.audioContext.destination);

            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 0.4; // 40% volume for music
            this.musicGain.connect(this.audioContext.destination);

            console.log('All sounds loaded and gain nodes configured successfully');
            return true;
        } catch (error) {
            console.error('Error loading sounds:', error);
            return false;
        }
    }

    playSound(name) {
        if (!this.sounds[name]) {
            console.error(`Sound not found: ${name}`);
            return;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        console.log(`Playing sound: ${name}`);
        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name];
        source.connect(this.gainNode); // Connect to the general gain node
        source.start(0);
    }

    startThrustSound() {
        if (!this.sounds.thrust || !this.thrustGain) {
            console.error('Thrust sound or thrustGain not loaded/initialized');
            return;
        }
        if (this.thrustSource) { // Avoid starting multiple thrust sounds
            return;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        console.log('Starting thrust sound');
        this.thrustSource = this.audioContext.createBufferSource();
        this.thrustSource.buffer = this.sounds.thrust;
        this.thrustSource.loop = true;
        this.thrustSource.connect(this.thrustGain);
        this.thrustSource.start(0);
    }

    stopThrustSound() {
        if (this.thrustSource) {
            console.log('Stopping thrust sound');
            this.thrustSource.stop();
            this.thrustSource.disconnect(); // Disconnect to free up resources
            this.thrustSource = null;
        }
    }

    startMusic() {
        if (!this.sounds.background || !this.musicGain) {
            console.error('Background music or musicGain not loaded/initialized');
            return;
        }
        if (this.musicSource) { // Avoid starting multiple music instances
            return;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        console.log('Starting music');
        this.musicSource = this.audioContext.createBufferSource();
        this.musicSource.buffer = this.sounds.background;
        this.musicSource.connect(this.musicGain);
        this.musicSource.loop = true;
        this.musicSource.start(0);
    }

    stopMusic() {
        if (this.musicSource) {
            console.log('Stopping music');
            this.musicSource.stop();
            this.musicSource.disconnect();
            this.musicSource = null;
        }
    }

    fadeOutMusic(duration = 500) {
        if (!this.musicGain || !this.musicSource) {
            console.warn('Music gain or source not available for fadeOut');
            return;
        }
        console.log(`Fading out music over ${duration}ms`);
        const initialVolume = this.musicGain.gain.value;
        const startTime = this.audioContext.currentTime;
        this.musicGain.gain.setValueAtTime(initialVolume, startTime);
        this.musicGain.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
        
        setTimeout(() => {
            this.stopMusic();
            // Reset gain for next time, only if it was successfully changed
            if(this.musicGain) this.musicGain.gain.setValueAtTime(initialVolume, this.audioContext.currentTime); 
        }, duration);
    }
}