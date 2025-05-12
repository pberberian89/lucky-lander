class HighScore {
    constructor(initials, score) {
        this.initials = initials;
        this.score = score;
    }
}

class Leaderboard {
    constructor(storageKey = "high_scores") {
        this.localStorageKey = storageKey;
        this.scores = [];
        this.db = window.firebaseDB || null;
        this.load_scores();
    }

    // 🔽 Load from Firebase first, fallback to localStorage
    load_scores() {
        if (this.db) {
            const scoresRef = firebase.database().ref('highscores');
            scoresRef.once('value', (snapshot) => {
                const scores = [];
                snapshot.forEach((child) => {
                    const data = child.val();
                    if (data && data.initials && typeof data.score === 'number') {
                        scores.push(new HighScore(data.initials, data.score));
                    }
                });
                scores.sort((a, b) => b.score - a.score);
                this.scores = scores.slice(0, 10);
                this.save_scores(); // cache to localStorage
            }, (error) => {
                console.error("Firebase load error:", error);
                this.load_from_local();
            });
        } else {
            this.load_from_local();
        }
    }

    load_from_local() {
        try {
            const data = localStorage.getItem(this.localStorageKey);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    this.scores = parsed.map(s => new HighScore(s.initials, s.score));
                }
            }
        } catch (e) {
            console.error("LocalStorage load error:", e);
        }
    }

    save_scores() {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.scores));
        } catch (e) {
            console.error("LocalStorage save error:", e);
        }
    }

    add_score(initials, score) {
        if (typeof initials !== 'string' || initials.length === 0 || typeof score !== 'number' || score < 0) {
            console.warn("Invalid score data:", initials, score);
            return;
        }

        const newEntry = new HighScore(initials, score);

        // Save to Firebase (if available)
        if (this.db) {
            const scoresRef = firebase.database().ref('highscores');
            const newScoreRef = firebase.database().push(scoresRef);
            newScoreRef.set({
                initials: newEntry.initials,
                score: newEntry.score,
                timestamp: Date.now()
            });
        }

        // Save to local list
        this.scores.push(newEntry);
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10);
        this.save_scores();
    }

    get_scores() {
        return this.scores;
    }
}