// Leaderboard class for the JavaScript Lunar Lander port

class HighScore {
    constructor(initials, score) {
        this.initials = initials;
        this.score = score;
    }
}

class Leaderboard {
    constructor(filename = "high_scores") { // Use a key name for localStorage
        this.localStorageKey = filename;
        this.scores = [];
        this.load_scores();
    }

    load_scores() {
        /** Load high scores from localStorage, or create empty list if not found. */
        try {
            const data = localStorage.getItem(this.localStorageKey);
            if (data) {
                const parsedData = JSON.parse(data);
                // Ensure loaded data matches HighScore structure
                if (Array.isArray(parsedData)) {
                     this.scores = parsedData.map(score => new HighScore(score.initials, score.score));
                } else {
                     this.scores = [];
                }
            } else {
                this.scores = [];
            }
        } catch (e) {
            console.error("Error loading scores from localStorage:", e);
            this.scores = [];
        }
    }

    save_scores() {
        /** Save high scores to localStorage. */
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.scores));
        } catch (e) {
            console.error("Error saving scores to localStorage:", e);
        }
    }

    add_score(initials, score) {
        /** Add a new score to the leaderboard and maintain top 10. */
        // Basic validation
        if (typeof initials !== 'string' || initials.length === 0 || typeof score !== 'number' || score < 0) {
             console.warn("Invalid score data provided:", initials, score);
             return;
        }
        this.scores.push(new HighScore(initials, score));
        this.scores.sort((a, b) => b.score - a.score); // Sort descending
        this.scores = this.scores.slice(0, 10); // Keep only top 10
        this.save_scores();
    }

    get_scores() {
        /** Return the current high scores. */
        return this.scores;
    }
}