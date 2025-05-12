// Main game file for the JavaScript Lunar Lander port
import { Leaderboard } from './leaderboard.js';
import { SoundManager } from './sounds.js';       // ✅ Needed
import { Lander } from './lander.js';             // ✅ If using Lander class
import { Terrain } from './terrain.js';           // ✅ If using Terrain class
import { Particle } from './particle.js';         // ✅ If using Particle class
import {
  FONT_NAME,
  GAME_SPEED_FACTOR,
  SAFE_LANDING_VY,
  SAFE_LANDING_VX,
  MAX_SAFE_ROTATION,
  LANDER_IMG_PATH,
  FUEL_CONSUMPTION_RATE,
  PARTICLE_GRAVITY
} from './constants.js';


// --- Constants ---
// Define constants here, similar to the Python version
const FPS = 60;
const GRAVITY = .20 * 60; // Scaled for per-second update in JS - User updated
const THRUST = .65 * 60; // Scaled for per-second update in JS - User updated
//const FUEL_CONSUMPTION_RATE = 35; // User updated
const ROTATION_SPEED = 100; // Degrees per second for rotation
//const GAME_SPEED_FACTOR = 1.25; // User updated - Preserving this value.
//const SAFE_LANDING_VY = 12; // User updated (Temporary for testing)
//const SAFE_LANDING_VX = 5;  // User updated (Temporary for testing)
//const MAX_SAFE_ROTATION = 4; // User updated (Temporary for testing)
const LOW_FUEL_THRESHOLD = 200;
//const FONT_NAME = "Hyperspace";

// Asset paths (relative to the web-lunar-lander directory)
const ASSETS_FOLDER = "assets";
// const FONT_NAME = "Hyperspace"; // Font name defined in CSS - Declared in lander.js
//const LANDER_IMG_PATH = ASSETS_FOLDER + "/lander.png";
// Sound paths are now managed by SoundManager in sounds.js

// --- Game Variables ---
let canvas;
let ctx;
let lander;
let terrain;
let particles = [];
let leaderboard;
let soundManager; 

let gameRunning = false;
let gameOver = false;
let titleScreen = true;
let enteringInitials = false;
let currentInitials = "";
let totalScore = 0;
let currentAttemptScore = 0; 
let lowFuelSoundPlayed = false; 

let landingMessageText = "";
let waitingForContinue = false; 

let camera_x = 0;

let lastTimestamp = 0;

// Input state
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Loaded Assets (now only images)
const assets = {};

// --- Asset Loading ---
async function loadGameAssets() { 
    const imagePromises = [
        new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                assets['lander'] = image;
                // console.log("Lander image loaded:", image);
                resolve();
            };
            image.onerror = (err) => {
                console.error("Error loading image:", LANDER_IMG_PATH, err);
                reject(err); 
            };
            image.src = LANDER_IMG_PATH;
        })
    ];

    const fontPromise = document.fonts.load(`24px ${FONT_NAME}`).then(() => {
        // console.log(`${FONT_NAME} font loaded.`);
    }).catch(err => {
        console.error(`Error loading font ${FONT_NAME}:`, err);
    });

    await Promise.all([...imagePromises, fontPromise]);
}


// --- Initialization ---
async function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    soundManager = new SoundManager();

    try {
        await loadGameAssets();
        await soundManager.loadSounds(); 

        const original_width = assets.lander.width;
        const original_height = assets.lander.height;
        const lander_width = Math.floor(canvas.width * 0.02);
        const scale_ratio = original_width > 0 ? lander_width / original_width : 1;
        const lander_height = Math.floor(original_height * scale_ratio);

        assets.lander.width = lander_width;
        assets.lander.height = lander_height;

        terrain = new Terrain(canvas.width * 10, canvas.height, lander_width); 
        lander = new Lander(ctx, assets.lander, canvas.width / 2, canvas.height / 2 - lander_height / 2, 2000, FUEL_CONSUMPTION_RATE);
        leaderboard = new Leaderboard(); 

        soundManager.startMusic();

        gameRunning = true;
        requestAnimationFrame(gameLoop); 

    } catch (error) {
        console.error("Error during game initialization:", error);
        ctx.fillStyle = 'red';
        ctx.font = `24px ${FONT_NAME}, Arial`; 
        ctx.textAlign = 'center';
        ctx.fillText('Error loading game assets. Please check console.', canvas.width / 2, canvas.height / 2);
    }

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

// --- Game Loop ---
function gameLoop(timestamp) {
    if (!gameRunning) {
        return;
    }

    let dt = (timestamp - lastTimestamp) / 1000; 
    lastTimestamp = timestamp;

    if (dt > 1/FPS * 3) { 
        dt = 1/FPS * 3;
    }
    const effective_dt = dt * GAME_SPEED_FACTOR;

    // --- Update Game State ---
    if (!titleScreen && !gameOver && !waitingForContinue) { 
        // --- Input Handling ---
        if (keys.ArrowLeft) {
            lander.rotate("left", ROTATION_SPEED, effective_dt); 
        }
        if (keys.ArrowRight) {
            lander.rotate("right", ROTATION_SPEED, effective_dt); 
        }
        if (keys.Space && lander.fuel > 0) {
            lander.apply_thrust(THRUST, effective_dt);
        } else {
            lander.reset_thrust(); 
            if (keys.Space && lander.fuel <= 0) { 
                soundManager.stopThrustSound(); 
            }
        }

        // Apply gravity and update position
        lander.apply_gravity(GRAVITY, effective_dt);
        lander.update_position(effective_dt);

        // Update particles
        

        // Update camera position
        const target_camera_x = lander.x - canvas.width / 2;
        const max_camera_x = terrain.total_width - canvas.width;
        camera_x = Math.max(0, Math.min(target_camera_x, max_camera_x));

        // Check for low fuel
        if (lander.fuel <= LOW_FUEL_THRESHOLD && lander.fuel > 0 && !lowFuelSoundPlayed) {
            soundManager.playSound('low_fuel');
            lowFuelSoundPlayed = true;
        } else if (lander.fuel > LOW_FUEL_THRESHOLD && lowFuelSoundPlayed) {
            lowFuelSoundPlayed = false; 
        }

        // Check for landing/crash
        const landing_result = lander.check_landing(terrain, canvas.height, SAFE_LANDING_VY, SAFE_LANDING_VX, MAX_SAFE_ROTATION);

        if (landing_result !== null) { 
            keys.Space = false; 
            if (lander.burning) { 
                lander.reset_thrust(); 
                soundManager.stopThrustSound(); 
            }

            if (landing_result) { 
                soundManager.playSound('safe_land');
                const { base_score, perfect_bonus } = lander.calculate_score(terrain, SAFE_LANDING_VY, SAFE_LANDING_VX, MAX_SAFE_ROTATION);
                currentAttemptScore = base_score + perfect_bonus;
                landingMessageText = `${base_score} SAFE LANDING + ${perfect_bonus} BONUS = ${currentAttemptScore} TOTAL`;
            } else { 
                 soundManager.playSound('crash');
                 lander.fuel -= 200; 
                 if (particles.length === 0) { 
                     const impact_x = lander.x + lander.width / 2;
                     const impact_y = lander.y + lander.height / 2;
                     const num_particles = 750; // Increased further for more particles
                     for (let i = 0; i < num_particles; i++) {
                         const angle = Math.random() * Math.PI * 2;
                         const speed = Math.random() * 150 + 100; 
                         const vx_p = Math.cos(angle) * speed; 
                         const vy_p = -Math.abs(Math.sin(angle) * speed * (Math.random() * 1.5 + 1.0)); 
                         const lifetime = Math.random() * 2.5 + 1.5; 
                         const start_color = [255, 255, 255];
                         const end_color = [Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), Math.floor(Math.random() * 50)];
                         const start_size = Math.random() * 25 + 10; 
                         const end_size = 0;
                         particles.push(new Particle(impact_x, impact_y, vx_p, vy_p, lifetime, start_color, end_color, start_size, end_size));
                     }
                 }
                 currentAttemptScore = 0;
                 landingMessageText = "CRASHED! SCORE: 0";
            }

            if (lander.fuel <= 0) {
                gameOver = true;
                enteringInitials = true;
                currentInitials = "";
                soundManager.stopMusic();
                totalScore += currentAttemptScore; 
                currentAttemptScore = 0; 
                landingMessageText = ""; 
                waitingForContinue = false; 
            } else {
                waitingForContinue = true; 
            }
        }
    }
// Update particles
        particles = particles.filter(p => p.update(effective_dt));

    // --- Drawing ---
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
if (!gameOver && ((!waitingForContinue && !titleScreen) || (waitingForContinue && lander.landed))) {
        lander.draw(camera_x);
    }

    terrain.draw(ctx, camera_x);
    if (!gameOver || particles.length > 0 || waitingForContinue) { 
        
    }
    particles.forEach(particle => particle.draw(ctx, camera_x));

    // Draw UI
    if (!titleScreen) {
        drawUI();
    }

    // --- Game State Transitions / Screen Drawing ---
    if (titleScreen) {
        drawTitleScreen();
    } else if (gameOver) {
        drawGameOverScreen();
    }

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// --- Event Handlers ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (lander) {
        lander.x = canvas.width / 2 - lander.width / 2;
        lander.y = canvas.height / 3; 
    }
    if (terrain) {
         terrain.screen_height = canvas.height;
    }
}

function resetGameStatesForNewAttempt() {
    keys.Space = false;
keys.ArrowLeft = false;
    keys.ArrowRight = false;
    if (lander) {
        lander.reset_thrust();
    }
    soundManager.stopThrustSound();
    soundManager.playSound('start');
    landingMessageText = ""; 
    waitingForContinue = false;
    lowFuelSoundPlayed = false;
    particles = [];
    gameOver = false;
    enteringInitials = false;
}

function handleKeyDown(event) {
    if (titleScreen) {
        if (event.code === 'Space') {
            titleScreen = false;
            soundManager.playSound('start');
            resetGameStatesForNewAttempt();
            totalScore = 0;
            currentAttemptScore = 0;
            if(terrain) terrain.reset(); 
            if(lander) lander.reset(2000, terrain); 
            soundManager.startMusic(); 
        }
    } else if (waitingForContinue && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')) {
        waitingForContinue = false;
        totalScore += currentAttemptScore; 
        currentAttemptScore = 0;           
        landingMessageText = "";

        keys.Space = false; 
        lander.reset_thrust(); 
        soundManager.stopThrustSound(); 

        terrain.reset(); 
        lander.reset(lander.fuel, terrain); 
        particles = [];
        lowFuelSoundPlayed = false;

    } else if (gameOver) {
        if (enteringInitials) {
            if (event.code === 'Enter' && currentInitials.length === 3) {
                leaderboard.add_score(currentInitials, totalScore); 
                enteringInitials = false;
            } else if (event.code === 'Backspace') {
                currentInitials = currentInitials.slice(0, -1);
            } else if (currentInitials.length < 3 && event.key.match(/^[a-zA-Z]$/)) {
                currentInitials += event.key.toUpperCase();
            }
        } else if (event.code === 'KeyR') {
            resetGameStatesForNewAttempt();
            terrain.reset(); 
            lander.reset(2000, terrain); 
            totalScore = 0;
            currentAttemptScore = 0;
            titleScreen = true;
            soundManager.startMusic(); 
        }
    } else if (!gameOver && !waitingForContinue) { 
        if (event.code in keys) {
            keys[event.code] = true;
        }

        if (event.code === 'Space' && lander.fuel > 0 && !lander.burning) { 
            soundManager.startThrustSound();
        }
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyR', 'KeyC', 'Enter', 'Backspace'].includes(event.code) || event.key.toLowerCase() === 'c') {
        event.preventDefault();
    }
}

function handleKeyUp(event) {
     if (!titleScreen && !gameOver && !waitingForContinue) { 
         if (event.code in keys) {
             keys[event.code] = false;
         }

         if (event.code === 'Space') { 
             soundManager.stopThrustSound();
         }
     }
}


// --- Drawing Functions ---
function drawUI() {
    ctx.fillStyle = 'white';
    ctx.font = `24px ${FONT_NAME}, Arial`; 
    ctx.textAlign = 'left';

    try {
        const terrain_y = terrain.terrain_height_at(lander.x + lander.width / 2);
        const lander_bottom_y = lander.y + lander.height;
        
        const altitude = Math.floor(Math.max(0, terrain_y - lander_bottom_y));
        const vertVel = Math.floor(lander.vy);
        const horVel = Math.floor(lander.vx);
        const rotation = Math.floor(lander.rotation); 
        const fuel = Math.floor(lander.fuel);

        const altStr = altitude.toString().padStart(4, ' ');
        const vvStr = vertVel.toString().padStart(4, ' ');
        const hvStr = horVel.toString().padStart(4, ' ');
        const rotStr = rotation.toString().padStart(3, ' ');
        const fuelStr = fuel.toString().padStart(4, ' ');
        const scoreStr = totalScore.toString().padStart(7, ' ');

        const status_text = `Alt: ${altStr} | Vert Vel: ${vvStr} | Hor Vel: ${hvStr} | Rotation: ${rotStr} | Fuel: ${fuelStr} | Score: ${scoreStr}`;
        ctx.fillText(status_text, 15, 30);

    } catch (e) {
        console.error("Error drawing UI status:", e);
        ctx.fillText("UI Error", 15, 30);
    }

    lander.draw_landing_multiplier(ctx, terrain, camera_x);

    if (landingMessageText) { 
        const prevTextAlign = ctx.textAlign;
        ctx.textAlign = 'center';
        ctx.font = `24px ${FONT_NAME}, Arial`; 
        ctx.fillText(landingMessageText, canvas.width / 2, 60); 
        if (waitingForContinue) {
            ctx.font = `20px ${FONT_NAME}, Arial`; 
            ctx.fillText("PRESS C TO CONTINUE", canvas.width / 2, 90); 
        }
        ctx.textAlign = prevTextAlign; 
    }
}

function drawTitleScreen() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const box_width = WIDTH * 0.6;
    const box_height = HEIGHT * 0.5;
    const box_x = (WIDTH - box_width) / 2;
    const box_y = (HEIGHT - box_height) / 2;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(box_x - 2, box_y - 2, box_width + 4, box_height + 4);

    ctx.fillStyle = 'black';
    ctx.fillRect(box_x, box_y, box_width, box_height);

    ctx.fillStyle = 'white';
    ctx.font = `72px ${FONT_NAME}, Arial`; 
    ctx.textAlign = 'center';
    ctx.fillText("LUCKY LANDER", WIDTH / 2, box_y + 100);

    ctx.font = `36px ${FONT_NAME}, Arial`; 
const instructions = [
    "LEFT/RIGHT ARROW to rotate lander",
    "SPACE BAR for thrust",
    "Land only in designated areas",
    "Max score for a perfect landing: 1000 points",
    `To land safely:`,
    ` - Vertical velocity < ${Math.round(SAFE_LANDING_VY)}`,
    ` - Horizontal velocity < ${Math.round(SAFE_LANDING_VX)}`,
    ` - Rotation < ${Math.round(MAX_SAFE_ROTATION)} degrees`,
    "",
    "Press SPACE BAR to begin"
];

    for (let i = 0; i < instructions.length; i++) {
        ctx.fillText(instructions[i], WIDTH / 2, box_y + 200 + i * 40);
    }
}

function drawGameOverScreen() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    ctx.fillStyle = 'white';
    ctx.font = `72px ${FONT_NAME}, Arial`; 
    ctx.textAlign = 'center';
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 4);

    ctx.font = `48px ${FONT_NAME}, Arial`; 
    const score_text = `TOTAL SCORE: ${totalScore.toString().padStart(7, ' ')}`; 
    ctx.fillText(score_text, WIDTH / 2, HEIGHT / 3);

    if (enteringInitials) {
        ctx.font = `36px ${FONT_NAME}, Arial`; 
        const input_text = `Enter Initials: ${currentInitials}`;
        ctx.fillText(input_text, WIDTH / 2, HEIGHT / 2);
    } else {
        const box_width = WIDTH * 0.6;
        const box_height = HEIGHT * 0.6;
        const box_x = (WIDTH - box_width) / 2;
        const box_y = (HEIGHT - box_height) / 2;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(box_x - 2, box_y - 2, box_width + 4, box_height + 4);

        ctx.fillStyle = 'black';
        ctx.fillRect(box_x, box_y, box_width, box_height);

        ctx.fillStyle = 'white';
        ctx.font = `72px ${FONT_NAME}, Arial`; 
        ctx.textAlign = 'center';
        ctx.fillText("LUCKY LANDER", WIDTH / 2, box_y + 80); // increased top padding

        ctx.font = `36px ${FONT_NAME}, Arial`; 
        ctx.fillText("HIGH SCORES:", WIDTH / 2, box_y + 150); // shifted down

        const scores = leaderboard.get_scores();
        ctx.font = `28px ${FONT_NAME}, Arial`; 
        const score_start_y = box_y + 190;
        scores.forEach((score, index) => {
            ctx.fillText(`${index + 1}. ${score.initials} - ${score.score.toString().padStart(7, ' ')}`, WIDTH / 2, score_start_y + index * 35); // centered
        });

        ctx.font = `24px ${FONT_NAME}, Arial`; 
        ctx.fillText("Press R to Restart", WIDTH / 2, box_y + box_height - 30);
    }
}

// --- Start the game ---
window.onload = initGame; // This is already set in index.html
window.soundManager = soundManager;