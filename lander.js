// Lander class for the JavaScript Lunar Lander port

// Constants from game.js that Lander uses (ensure these are defined in game.js and accessible)
// const FUEL_CONSUMPTION_RATE = 0.2; // Example, ensure it's defined in game.js
const FONT_NAME = "Hyperspace"; // Added for consistency with game.js

class Lander {
    // Scoring Constants
    static BASE_LANDING_SCORE = 100;
    static PERFECT_BONUS = 500;
    // MULTIPLIER constants are used in calculate_score, not directly for movement/drawing

    constructor(screen, image, x_center_ignored, start_y_ignored, fuel, fuel_consumption_rate) {
        this.screen = screen;
        this.image = image;

        this.width = image.width > 0 ? image.width : 32;
        this.height = image.height > 0 ? image.height : 24;

        this.x = this.screen.canvas.width / 2 - this.width / 2;
        this.y = this.screen.canvas.height / 3;
        // console.log(`Constructor: canvas.width=${this.screen.canvas.width}, canvas.height=${this.screen.canvas.height}, this.width=${this.width}, this.height=${this.height}, this.x=${this.x}, this.y=${this.y}`);
        this.fuel = fuel;
        // console.log("Lander fuel set to:", this.fuel);

        this.vx = Math.floor(Math.random() * 20) + 1;
        this.vy = 0;
        this.rotation = Math.random() * 180 - 90;

        this.FUEL_CONSUMPTION_RATE = fuel_consumption_rate;
        this.burning = false;
        this.landed = false;
        this.thrust_timer = 0;
    }

    reset(fuel_val, terrain = null) {
        this.x = this.screen.canvas.width / 2 - this.width / 2;
        this.y = this.screen.canvas.height / 3;
        // console.log(`Reset: canvas.width=${this.screen.canvas.width}, canvas.height=${this.screen.canvas.height}, this.width=${this.width}, this.height=${this.height}, this.x=${this.x}, this.y=${this.y}`);
        this.fuel = fuel_val;
        // console.log("Lander fuel set to:", this.fuel);
        this.vx = Math.floor(Math.random() * 20) + 1;
        this.vy = 0;
        this.rotation = Math.random() * 180 - 90;
        this.burning = false;
        this.landed = false;
        this.thrust_timer = 0;
    }

    rotate(direction, angle_step, dt) {
        if (direction === "left") {
            this.rotation = (this.rotation - angle_step * dt);
        } else if (direction === "right") {
            this.rotation = (this.rotation + angle_step * dt);
        }
        this.rotation = this.rotation % 360;
        if (this.rotation < 0) {
            this.rotation += 360;
        }
    }

    apply_thrust(thrust_force, dt) {
        if (this.fuel > 0) {
            const rad = this.rotation * Math.PI / 180;
            this.vx += thrust_force * Math.sin(rad) * dt;
            this.vy += thrust_force * -Math.cos(rad) * dt;

            this.fuel -= this.FUEL_CONSUMPTION_RATE * dt;
            this.burning = true;
            this.thrust_timer += dt;
        } else {
            this.burning = false;
            this.fuel = 0;
        }
    }

    apply_gravity(gravity_force, dt) {
        this.vy += gravity_force * dt;
    }

    update_position(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(camera_x) {
        const ctx = this.screen;
        ctx.save();

        const centerX_on_canvas = this.x - camera_x + this.width / 2;
        const centerY_on_canvas = this.y + this.height / 2;

        ctx.translate(centerX_on_canvas, centerY_on_canvas);
        ctx.rotate(this.rotation * Math.PI / 180);

        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
             ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = 'grey';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        if (this.burning) {
            const nozzle_y_local = this.height / 2;
            const flame_length = 10 + Math.min(50, this.thrust_timer * 100 * (1/GAME_SPEED_FACTOR) );
            const flame_width_half = 5;

            const p1x_local = -flame_width_half;
            const p1y_local = nozzle_y_local;

            const p2x_local = flame_width_half;
            const p2y_local = nozzle_y_local;

            const tipX_local = 0;
            const tipY_local = nozzle_y_local + flame_length;

            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.moveTo(p1x_local, p1y_local);
            ctx.lineTo(p2x_local, p2y_local);
            ctx.lineTo(tipX_local, tipY_local);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    reset_thrust() {
        this.burning = false;
        this.thrust_timer = 0;
    }

    get_feet_positions() {
        const rad = this.rotation * Math.PI / 180;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const half_w = this.width / 2;
        const half_h = this.height / 2;

        const bl_dx_local = -half_w;
        const bl_dy_local = half_h;
        const br_dx_local = half_w;
        const br_dy_local = half_h;

        const left_x = cx + bl_dx_local * Math.cos(rad) - bl_dy_local * Math.sin(rad);
        const left_y = cy + bl_dx_local * Math.sin(rad) + bl_dy_local * Math.cos(rad);

        const right_x = cx + br_dx_local * Math.cos(rad) - br_dy_local * Math.sin(rad);
        const right_y = cy + br_dx_local * Math.sin(rad) + bl_dy_local * Math.cos(rad);

        return [{ x: left_x, y: left_y }, { x: right_x, y: right_y }];
    }

    check_landing(terrain, screen_height, max_safe_vy, max_safe_vx, max_safe_rotation) {
        const [left_foot, right_foot] = this.get_feet_positions();

        const left_terrain_height = terrain.terrain_height_at(left_foot.x);
        const right_terrain_height = terrain.terrain_height_at(right_foot.x);

        console.log(`--- Check Landing ---`);
        console.log(`Lander Coords: x=${this.x.toFixed(2)}, y=${this.y.toFixed(2)}`);
        console.log(`Lander Vels: vx=${this.vx.toFixed(2)}, vy=${this.vy.toFixed(2)}`);
        console.log(`Lander Rot: ${this.rotation.toFixed(2)}`);
        console.log(`Safe Limits: max_vy=${max_safe_vy}, max_vx=${max_safe_vx}, max_rot=${max_safe_rotation}`);

        if (left_foot.y >= left_terrain_height || right_foot.y >= right_terrain_height) {
            console.log(`Contact detected: LeftFootY=${left_foot.y.toFixed(2)} >= LeftTerrainH=${left_terrain_height.toFixed(2)-1} OR RightFootY=${right_foot.y.toFixed(2)} >= RightTerrainH=${right_terrain_height.toFixed(2)-1}`);

            const left_in_flat = terrain.is_on_flat_zone(left_foot.x, left_foot.y);
            const right_in_flat = terrain.is_on_flat_zone(right_foot.x, right_foot.y);

            const velocity_ok = Math.abs(this.vy) <= max_safe_vy && Math.abs(this.vx) <= max_safe_vx;

            let normalized_rotation = this.rotation % 360;
            if (normalized_rotation > 180) normalized_rotation -= 360;
            if (normalized_rotation < -180) normalized_rotation += 360;

            const rotation_ok = Math.abs(normalized_rotation) <= max_safe_rotation;
            const height_difference_ok = Math.abs(left_terrain_height - right_terrain_height) <= 2; const on_a_flat_zone = terrain.is_on_flat_zone(left_foot.x, left_foot.y, 5) || terrain.is_on_flat_zone(right_foot.x, right_foot.y, 5); const position_ok = height_difference_ok && on_a_flat_zone;

            console.log(`Left Foot: x=${left_foot.x.toFixed(2)}, y=${left_foot.y.toFixed(2)}, terrain_h=${left_terrain_height.toFixed(2)}, in_flat=${left_in_flat}`);
            console.log(`Right Foot: x=${right_foot.x.toFixed(2)}, y=${right_foot.y.toFixed(2)}, terrain_h=${right_terrain_height.toFixed(2)}, in_flat=${right_in_flat}`);
            console.log(`Conditions: velocity_ok=${velocity_ok}, rotation_ok=${rotation_ok}, position_ok=${position_ok}`);

            if (velocity_ok && rotation_ok && position_ok) {
                this.landed = true;
                console.log("Landing Result: SAFE (true)");
                return true; // Safe
            }
            console.log("Landing Result: CRASH (false)");
            return false; // Crash
        }
        // console.log("Landing Result: IN AIR (null)"); // This would be too verbose for every frame
        return null; // Still in air
    }

    get_altitude(ground_level) {
        return Math.max(0, Math.floor(ground_level - (this.y + this.height)));
    }

    get_landing_zone_width(terrain, x) {
        if (!terrain.is_flat_zone(x)) {
            return 0;
        }
        let start_x = x;
        while (terrain.is_flat_zone(start_x - 1)) {
            start_x -= 1;
        }
        let end_x = x;
        while (terrain.is_flat_zone(end_x + 1)) {
            end_x += 1;
        }
        return end_x - start_x;
    }

    draw_landing_multiplier(screen_ctx, terrain, camera_x) {
        const ctx = screen_ctx;
        const current_time = Date.now();
        const blink_on = Math.floor(current_time / 500) % 2 === 0;

        for (const [start_x, end_x, flat_y] of terrain.flat_zones) {
            const zone_width = end_x - start_x;
            let multiplier_text = "1X";
            if (zone_width < this.width * 2) multiplier_text = "5X";
            else if (zone_width < this.width * 3) multiplier_text = "3X";

            if (blink_on) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(start_x - camera_x, flat_y);
                ctx.lineTo(end_x - camera_x, flat_y);
                ctx.stroke();
            }

            ctx.fillStyle = 'white';
            ctx.font = `24px ${FONT_NAME}, Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(multiplier_text, (start_x + end_x) / 2 - camera_x, flat_y + 20);
        }
    }

    calculate_score(terrain, safe_vy, safe_vx, max_rotation) {
        if (!this.landed) {
            return { base_score: 0, perfect_bonus: 0 };
        }

        const landing_x = (this.x + this.width / 2);
        const zone_width = this.get_landing_zone_width(terrain, landing_x);

        let multiplier = 1;
        if (zone_width < this.width * 2) multiplier = 5;
        else if (zone_width < this.width * 3) multiplier = 3;

        const vy_percent = Math.max(0, 1 - (Math.abs(this.vy) / safe_vy));
        const vx_percent = Math.max(0, 1 - (Math.abs(this.vx) / safe_vx));

        let rotation_val = Math.abs(this.rotation % 360);
        rotation_val = Math.min(rotation_val, 360 - rotation_val);
        const rotation_percent = Math.max(0, 1 - (rotation_val / max_rotation));

        const perfect_bonus = Math.floor(Lander.PERFECT_BONUS * (vy_percent + vx_percent + rotation_percent) / 3);
        const base_score = Math.floor(Lander.BASE_LANDING_SCORE * multiplier);

        return { base_score: base_score, perfect_bonus: perfect_bonus };
    }
}