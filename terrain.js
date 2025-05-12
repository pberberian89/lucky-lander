// Terrain class for the JavaScript Lunar Lander port

class Terrain {
    constructor(total_width, screen_height, lander_w_size) {
        this.points = []; // List of {x, y} points defining terrain shape
        this.flat_zones = []; // List of [start_x, end_x, y] ranges for flat landing zones
        this.total_width = total_width;
        this.screen_height = screen_height;
        this.mfz = lander_w_size + 4; // minimum flat zone width
        this.generate_terrain(); // Generate terrain on initialization
    }

    generate_terrain() {
        /**
         * Generates terrain with a pixelated look using small steps guided by
         * a larger trend, forming mountains with textured slopes.
         */
        this.points = [];
        this.flat_zones = [];

        // --- Parameters ---
        // Vertical bounds (adjust for desired mountain height)
        const min_y = this.screen_height - 1300;
        const max_y = this.screen_height - 100;

        // Step controls (key for pixelated look)
        const segment_width = 3; // Use 1 for true pixel-by-pixel, or Math.floor(Math.random() * 3) + 1 for slightly faster generation
        const step_y_range = 6; // Max random change per step (+/-), creates local texture

        // Trend controls (key for large mountains)
        let vertical_trend = 0.0; // Current upward/downward drift
        const trend_strength = 1.8; // Max slope of the trend (adjust for steepness)
        const min_trend_interval = 80; // Min pixels before trend can change
        const max_trend_interval = 200; // Max pixels before trend can change

        // Flat zone controls
        const flat_zone_probability = 0.004; // Probability check *per pixel step* (keep low)
        const min_dist_between_flats = this.mfz * 9;

        // --- Generation ---
        let x = 0;
        let last_y = min_y + 1000 + Math.random() * (max_y - 100 - (min_y + 1000)); // Start somewhere in middle
        this.points.push({ x: x, y: last_y }); // Store y as float for trend accumulation

        let steps_since_trend_change = 0;
        let current_trend_interval = Math.floor(Math.random() * (max_trend_interval - min_trend_interval + 1)) + min_trend_interval;

        while (x < this.total_width) {

            // --- Trend Update ---
            steps_since_trend_change += segment_width;
            if (steps_since_trend_change >= current_trend_interval) {
                // Set a new trend direction/strength
                vertical_trend = (Math.random() * 2 * trend_strength) - trend_strength;
                steps_since_trend_change = 0;
                current_trend_interval = Math.floor(Math.random() * (max_trend_interval - min_trend_interval + 1)) + min_trend_interval;
            }

            // --- Flat Zone Check ---
            let can_create_flat = true;
            if (Math.random() >= flat_zone_probability) can_create_flat = false;
            if (this.flat_zones.length > 0 && x < this.flat_zones[this.flat_zones.length - 1][1] + min_dist_between_flats) can_create_flat = false;

            const flat_width_target = Math.floor(this.mfz * (1.0 + Math.random() * 2.5)); // Randomize flat width slightly
            if (x + flat_width_target >= this.total_width) can_create_flat = false;

            // --- Flat Zone Creation ---
            if (can_create_flat) {
                const start_x = x;
                const end_x = x + flat_width_target;
                const flat_y = Math.round(last_y); // Use the integer y-level for the flat zone

                // Add points across the flat zone (pixel by pixel if segment_width=1)
                let current_x_in_flat = x;
                while (current_x_in_flat < end_x) {
                    const step = Math.min(segment_width, end_x - current_x_in_flat);
                    if (step <= 0) break;
                    current_x_in_flat += step;
                    this.points.push({ x: current_x_in_flat, y: flat_y }); // Store as float for consistency
                }

                x = end_x; // Update main x position
                last_y = flat_y; // Update last_y to the flat level
                this.flat_zones.push([start_x, end_x, flat_y]);
                // Reset trend calculation after flat zone
                steps_since_trend_change = 0;
                current_trend_interval = Math.floor(Math.random() * (max_trend_interval - min_trend_interval + 1)) + min_trend_interval;
                vertical_trend = (Math.random() * 2 * trend_strength) - trend_strength; // Start new trend
                continue; // Skip jagged generation for this step
            }

            // --- Jagged/Pixelated Terrain Creation ---
            // Calculate next position based on trend and small random step
            const step_y = (Math.random() * 2 * step_y_range) - step_y_range;
            let next_y = last_y + vertical_trend * segment_width + step_y; // Apply trend over the segment width

            // Clamp Y
            next_y = Math.max(min_y, Math.min(max_y, next_y));

            // Move horizontally
            x += segment_width;
            if (x > this.total_width) x = this.total_width; // Don't overshoot

            this.points.push({ x: x, y: next_y });
            last_y = next_y; // Update last_y for the next iteration
        }
    }

    draw(screen, camera_x) {
        /**
         * Draws the terrain on screen.
         */
        const ctx = screen;
        const screen_width = ctx.canvas.width;
        // const current_time = Date.now(); // Unused
        // const pulse = Math.floor(180 + 75 * Math.sin(current_time * 0.014)); // Unused

        // The flat_segments_indices logic was complex and its visual effect (blinking lines)
        // is already handled by lander.draw_landing_multiplier for the text.
        // Simplifying to just draw white lines for terrain.

        // --- Draw loop ---
        ctx.beginPath();
        ctx.strokeStyle = 'white'; // Default color
        ctx.lineWidth = 1;

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const y1 = Math.round(p1.y);
            const y2 = Math.round(p2.y);

            const screen_x1 = Math.round(p1.x - camera_x);
            const screen_x2 = Math.round(p2.x - camera_x);

            if (Math.max(screen_x1, screen_x2) < 0 || Math.min(screen_x1, screen_x2) > screen_width) {
                continue;
            }

            // Draw the line segment
            ctx.moveTo(screen_x1, y1);
            ctx.lineTo(screen_x2, y2);
        }
        ctx.stroke(); // Draw all segments at once for performance
    }


    terrain_height_at(x) {
        /** Returns interpolated terrain height (rounded) at a given x-coordinate. */
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];

            // Handle cases where segment width might be 0 due to rounding or end conditions
            if (p2.x <= p1.x) {
                if (Math.abs(x - p1.x) < 0.5) { // If x is essentially at this point
                    return Math.round(p1.y);
                } else {
                    continue; // Skip zero-width segments unless x is right on them
                }
            }

            // Check if x is within the horizontal bounds of this segment
            if (p1.x <= x && x <= p2.x) {
                // Linear interpolation
                const t = (x - p1.x) / (p2.x - p1.x);
                const interpolated_y = p1.y + t * (p2.y - p1.y);
                return Math.round(interpolated_y);
            }
        }

        // Fallback if x is outside the range
        if (this.points.length > 0) {
            if (x < this.points[0].x) return Math.round(this.points[0].y);
            if (x > this.points[this.points.length - 1].x) return Math.round(this.points[this.points.length - 1].y);
        }

        return this.screen_height; // Default fallback
    }

    is_flat_zone(x) {
        /** Checks if the given x-coordinate lies within any flat landing zone range. */
        for (const [start, end, _] of this.flat_zones) {
            if (start <= x && x <= end) {
                return true;
            }
        }
        return false;
    }

    is_on_flat_zone(x, y, tolerance = 5) { // Reduced tolerance for pixelated check
        /** Checks if point (x,y) is on a flat zone within tolerance */
        const target_y = Math.round(y);
        for (const [start, end, flat_y] of this.flat_zones) {
            // Check y first as it's faster
            if (Math.abs(target_y - flat_y) <= tolerance) {
                if (start <= x && x <= end) {
                    return true;
                }
            }
        }
        return false;
    }

    reset() {
        /** Clears existing terrain and regenerates new terrain. */
        this.points = [];
        this.flat_zones = [];
        this.generate_terrain();
    }
}