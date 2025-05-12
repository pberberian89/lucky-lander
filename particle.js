// Particle class for the JavaScript Lunar Lander port

// --- Constants ---
 // Gravity affecting particles (pixels per second, per second)

export class Particle {
    static PARTICLE_GRAVITY = 15;
    constructor(x, y, vx, vy, lifetime, start_color, end_color, start_size, end_size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.lifetime = lifetime;
        this.age = 0;
        this.start_color = start_color;
        this.end_color = end_color;
        this.start_size = start_size;
        this.end_size = end_size;
        this.dead = false;

        // Pre-calculate color steps for performance
        this.color_steps = [
            (end_color[0] - start_color[0]) / lifetime,
            (end_color[1] - start_color[1]) / lifetime,
            (end_color[2] - start_color[2]) / lifetime
        ];

        // Pre-calculate size step
        this.size_step = (end_size - start_size) / lifetime;
    }

    update(dt) { // dt here will be effective_dt from game.js
console.log(`Particle update: dt=${dt.toFixed(4)}, age=${this.age.toFixed(4)}`);
        /** Update particle state and return True if still alive. */
        if (this.dead) {
            return false;
        }

        this.age += dt;
        if (this.age >= this.lifetime) {
            this.dead = true;
            return false;
        }

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Apply gravity
        this.vy += PARTICLE_GRAVITY * dt; 

        return true;
    }

    draw(screen, camera_x) {
        /** Draw the particle with optimized rendering. */
        if (this.dead) {
            return;
        }

        const ctx = screen;

        // Calculate current color
        // const progress = this.age / this.lifetime; // progress not directly used for color/size anymore
        const current_color = [
            Math.floor(this.start_color[0] + this.color_steps[0] * this.age),
            Math.floor(this.start_color[1] + this.color_steps[1] * this.age),
            Math.floor(this.start_color[2] + this.color_steps[2] * this.age)
        ];

        // Calculate current size
        const current_size = Math.max(1, Math.floor(this.start_size + this.size_step * this.age));

        // Draw particle as a circle
        ctx.fillStyle = `rgb(${current_color[0]}, ${current_color[1]}, ${current_color[2]})`;
        ctx.beginPath();
        ctx.arc(this.x - camera_x, this.y, current_size, 0, Math.PI * 2);
        ctx.fill();
    }
}