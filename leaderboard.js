import {
  getDatabase,
  ref,
  push,
  set,
  get,
  child
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

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
    this.db = getDatabase(); // use modern Firebase modular import
    this.load_scores();
  }

  async load_scores() {
    try {
      const snapshot = await get(child(ref(this.db), 'highscores'));
      const scores = [];

      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data && data.initials && typeof data.score === 'number') {
            scores.push(new HighScore(data.initials, data.score));
          }
        });

        scores.sort((a, b) => b.score - a.score);
        this.scores = scores.slice(0, 10);
        this.save_scores(); // cache in localStorage
      } else {
        this.load_from_local(); // fallback if empty
      }
    } catch (e) {
      console.error("Error loading from Firebase, falling back to localStorage:", e);
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
      console.error("Error loading scores from localStorage:", e);
    }
  }

  save_scores() {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.scores));
    } catch (e) {
      console.error("Error saving scores to localStorage:", e);
    }
  }

  add_score(initials, score) {
    if (typeof initials !== 'string' || initials.length === 0 || typeof score !== 'number' || score < 0) {
      console.warn("Invalid score data:", initials, score);
      return;
    }

    const newEntry = new HighScore(initials, score);

    // Save to Firebase
    try {
      const scoresRef = ref(this.db, 'highscores');
      const newScoreRef = push(scoresRef);
      set(newScoreRef, {
        initials: newEntry.initials,
        score: newEntry.score,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error("Failed to push score to Firebase:", e);
    }

    // Save to local scores
    this.scores.push(newEntry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);
    this.save_scores();
  }

  get_scores() {
    return this.scores;
  }
}

export { Leaderboard };