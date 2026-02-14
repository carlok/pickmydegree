import { ref, watch } from 'vue';
import { useDataStore } from './useDataStore';
import allDegrees from '../data/degrees.json';

// Valid phases so we can detect corrupted/old saved state
const VALID_PHASES = ['welcome', 'rules', 'donate', 'categories', 'phase1', 'phase2', 'phase3-bracket', 'results'];

const defaultState = () => ({
    phase: 'welcome',
    survivingDegrees: [],
    eliminatedDegrees: [],
    phase2Queue: [],
    phase2TotalPairs: 0,
    bracketQueue: [],
    nextRoundQueue: [],
    currentMatch: null,
    round: 1,
    winner: null,
    bracketTotal: 0
});

// Singleton: shared state and store so all components see the same game state
const store = useDataStore();
const state = ref(defaultState());

watch(state, (newState) => {
    store.save(newState);
}, { deep: true });

/** Returns a sanitized state object or null if saved is invalid (so we don't apply it after refresh). */
function validateSavedState(saved) {
    if (!saved || typeof saved !== 'object') return null;
    const phase = saved.phase;
    if (!VALID_PHASES.includes(phase)) return null;
    if (!Array.isArray(saved.survivingDegrees)) return null;
    if (!Array.isArray(saved.eliminatedDegrees)) return null;
    return {
        phase: saved.phase,
        survivingDegrees: saved.survivingDegrees,
        eliminatedDegrees: saved.eliminatedDegrees,
        phase2Queue: Array.isArray(saved.phase2Queue) ? saved.phase2Queue : [],
        phase2TotalPairs: typeof saved.phase2TotalPairs === 'number' ? saved.phase2TotalPairs : 0,
        bracketQueue: Array.isArray(saved.bracketQueue) ? saved.bracketQueue : [],
        nextRoundQueue: Array.isArray(saved.nextRoundQueue) ? saved.nextRoundQueue : [],
        currentMatch: saved.currentMatch ?? null,
        round: typeof saved.round === 'number' ? saved.round : 1,
        winner: saved.winner ?? null,
        bracketTotal: typeof saved.bracketTotal === 'number' ? saved.bracketTotal : 0
    };
}

// Utility: Fisher-Yates shuffle
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function useGameEngine() {
    // --- Initialization & Persistence ---

    /** Repairs bracket state when we have phase3-bracket but no current match (e.g. after reload). */
    const repairBracketState = () => {
        const s = state.value;
        if (s.phase !== 'phase3-bracket' || s.currentMatch != null || (s.bracketQueue && s.bracketQueue.length > 0)) return;
        const total = s.bracketTotal || 0;
        if (total < 2) return;
        const next = s.nextRoundQueue || [];
        if (next.length > 0) {
            // Between rounds: build queue from nextRoundQueue
            state.value.bracketQueue = [];
            for (let i = 0; i < next.length; i += 2) {
                if (next[i + 1] != null) state.value.bracketQueue.push({ a: next[i], b: next[i + 1] });
            }
        } else {
            // Start of bracket (round 1): build queue from survivingDegrees
            const survivors = s.survivingDegrees || [];
            if (survivors.length < 2) return;
            state.value.bracketQueue = [];
            for (let i = 0; i < survivors.length; i += 2) {
                if (survivors[i + 1] != null) state.value.bracketQueue.push({ a: survivors[i], b: survivors[i + 1] });
            }
        }
        if (state.value.bracketQueue.length > 0) {
            state.value.currentMatch = state.value.bracketQueue.shift();
        }
    };

    const init = () => {
        try {
            const saved = store.load();
            const validated = validateSavedState(saved);
            if (validated) {
                state.value = validated;
                if (validated.phase === 'phase3-bracket') repairBracketState();
            }
        } catch (_) {
            // If load or validate throws (e.g. corrupted data), keep default state so the app doesn't go blank
        }
    };

    const resetGame = () => {
        store.clear();
        state.value = defaultState();
    };

    const goToRules = () => {
        state.value.phase = 'rules';
    };

    const goToWelcome = () => {
        state.value.phase = 'welcome';
    };

    const goToDonate = () => {
        state.value.phase = 'donate';
    };

    const startNewGame = () => {
        state.value.phase = 'categories';
        state.value.survivingDegrees = shuffle([...allDegrees]);
        state.value.eliminatedDegrees = [];
        state.value.round = 1;
    };

    /** Remove a whole category: all degrees in that category are eliminated (Phase 0: by category). */
    const removeCategory = (categoryName) => {
        if (state.value.phase !== 'categories') return;
        const surviving = state.value.survivingDegrees;
        const toRemove = surviving.filter((d) => d.category === categoryName);
        if (toRemove.length === 0) return;
        state.value.survivingDegrees = surviving.filter((d) => d.category !== categoryName);
        state.value.eliminatedDegrees = [
            ...state.value.eliminatedDegrees,
            ...toRemove.map((d) => ({ ...d, round: 'categories' }))
        ];
    };

    /** Leave categories phase and go to Phase 1 (filter). Requires at least 2 survivors. */
    const completeCategories = () => {
        if (state.value.phase !== 'categories') return { success: false };
        if (state.value.survivingDegrees.length < 2) return { success: false, message: 'Keep at least 2 degrees (or one category).' };
        state.value.phase = 'phase1';
        return { success: true };
    };

    /** Restore a removed category (Phase 0): move all its degrees from eliminated back to surviving. */
    const restoreCategory = (categoryName) => {
        if (state.value.phase !== 'categories') return { success: false };
        const eliminated = state.value.eliminatedDegrees;
        const toRestore = eliminated.filter((d) => d.round === 'categories' && d.category === categoryName);
        if (toRestore.length === 0) return { success: false };
        const cleanDegrees = toRestore.map((item) => {
            const { round: __, ...deg } = item;
            return deg;
        });
        state.value.eliminatedDegrees = eliminated.filter((d) => !(d.round === 'categories' && d.category === categoryName));
        state.value.survivingDegrees = [...state.value.survivingDegrees, ...cleanDegrees];
        return { success: true };
    };

    // --- Phase 1: Hard Filtering ---

    const togglePhase1Selection = (id) => {
        const surviving = state.value.survivingDegrees;
        const surIndex = surviving.findIndex(d => d.id === id);
        if (surIndex > -1) {
            const [removed] = surviving.splice(surIndex, 1);
            state.value.survivingDegrees = surviving;
            state.value.eliminatedDegrees = [...state.value.eliminatedDegrees, { ...removed, round: 'phase1', eliminatedAtIndex: surIndex }];
        } else {
            const eliminated = state.value.eliminatedDegrees;
            const elimIndex = eliminated.findIndex(d => d.id === id);
            if (elimIndex > -1) {
                const item = eliminated[elimIndex];
                const at = item.eliminatedAtIndex != null ? Math.min(item.eliminatedAtIndex, surviving.length) : surviving.length;
                const { eliminatedAtIndex: _, round: __, ...degree } = item;
                const newEliminated = eliminated.slice(0, elimIndex).concat(eliminated.slice(elimIndex + 1));
                const newSurviving = surviving.slice(0, at).concat(degree, surviving.slice(at));
                state.value.eliminatedDegrees = newEliminated;
                state.value.survivingDegrees = newSurviving;
            }
        }
    };

    /** Restore the most recently eliminated degree (Phase 1 undo) at its original position. */
    const undoPhase1 = () => {
        if (state.value.phase !== 'phase1') return { success: false };
        const eliminated = state.value.eliminatedDegrees;
        if (eliminated.length === 0) return { success: false };
        const item = eliminated[eliminated.length - 1];
        const at = item.eliminatedAtIndex != null ? Math.min(item.eliminatedAtIndex, state.value.survivingDegrees.length) : state.value.survivingDegrees.length;
        const { eliminatedAtIndex: _, round: __, ...degree } = item;
        state.value.eliminatedDegrees = eliminated.slice(0, -1);
        state.value.survivingDegrees = state.value.survivingDegrees.slice(0, at).concat(degree, state.value.survivingDegrees.slice(at));
        return { success: true };
    };

    const completePhase1 = () => {
        if (state.value.survivingDegrees.length < 2) {
            return { success: false, message: "Please keep at least 2 degrees!" };
        }

        // Check if power of 2
        const n = state.value.survivingDegrees.length;
        const isPowerOf2 = (n & (n - 1)) === 0;

        // If not a power of 2 after Phase 1, we reduce to the largest power of 2 via Phase 2
        // (minimal number of pairwise "keep one, discard one" matches; rest get a bye). Then bracket.
        // If already a power of 2 (any size) -> go to Bracket directly.
        if (isPowerOf2) {
            startBracketPhase();
        } else {
            startPhase2();
        }
        return { success: true };
    };

    // --- Phase 2: Direct elimination to reach a power of 2 ---
    // After Phase 1 we may have e.g. 20 or 12 survivors. We run pairwise "keep one, discard one"
    // until we have exactly the largest power of 2 ≤ current count (e.g. 20→16, 12→8). Byes are used
    // so we need exactly (current - target) eliminations, i.e. that many matches.

    const startPhase2 = () => {
        state.value.phase = 'phase2';
        state.value.round = 1;

        const currentCount = state.value.survivingDegrees.length;
        const target = Math.pow(2, Math.floor(Math.log2(currentCount))); // largest power of 2 ≤ current
        const numEliminationsNeeded = currentCount - target;
        // numEliminationsNeeded matches (each eliminates 1); 2*numEliminationsNeeded players in matches; rest get a bye.

        // Shuffle to ensure random matchups
        state.value.survivingDegrees = shuffle(state.value.survivingDegrees);

        const players = state.value.survivingDegrees.slice(0, numEliminationsNeeded * 2);
        const byePlayers = state.value.survivingDegrees.slice(numEliminationsNeeded * 2);

        // Queue matches
        state.value.phase2Queue = [];
        for (let i = 0; i < players.length; i += 2) {
            state.value.phase2Queue.push({
                a: players[i],
                b: players[i + 1]
            });
        }
        state.value.phase2TotalPairs = state.value.phase2Queue.length;

        // Survivors list effectively acts as "next round" holding area.
        // We keep bye players in it? No, simpler to clear survivingDegrees and re-populate.
        // Or... keep byePlayers in a separate "safe" list and add winners to it?
        // Let's use `nextRoundQueue` concept here too for consistent logic.
        state.value.nextRoundQueue = [...byePlayers];

        nextPhase2Match();
    };

    const nextPhase2Match = () => {
        if (state.value.phase2Queue.length === 0) {
            // Phase 2 Done.
            // Move winners (nextRoundQueue) back to survivingDegrees
            state.value.survivingDegrees = [...state.value.nextRoundQueue];
            state.value.nextRoundQueue = [];

            // Proceed to Bracket
            startBracketPhase();
            return;
        }
        state.value.currentMatch = state.value.phase2Queue.shift();
    };

    /** keepId = the degree to KEEP (winner); the other is discarded. */
    const resolvePhase2Match = (keepId) => {
        const { a, b } = state.value.currentMatch;
        const winner = a.id === keepId ? a : b;
        const loser = a.id === keepId ? b : a;

        state.value.nextRoundQueue.push(winner);
        state.value.eliminatedDegrees.push({ ...loser, round: 'phase2' });

        state.value.currentMatch = null;
        nextPhase2Match();
    };

    const resolvePhase2MatchRandomly = () => {
        const { a, b } = state.value.currentMatch;
        const keep = Math.random() < 0.5 ? a : b;
        resolvePhase2Match(keep.id);
        return keep;
    };

    // --- Phase 3: Bracket ---

    const startBracketPhase = () => {
        state.value.phase = 'phase3-bracket';
        state.value.round = 1;
        const survLen = state.value.survivingDegrees.length;
        state.value.bracketTotal = survLen;

        state.value.survivingDegrees = shuffle(state.value.survivingDegrees);

        state.value.bracketQueue = [];
        for (let i = 0; i < state.value.survivingDegrees.length; i += 2) {
            state.value.bracketQueue.push({
                a: state.value.survivingDegrees[i],
                b: state.value.survivingDegrees[i + 1]
            });
        }
        state.value.nextRoundQueue = [];

        nextBracketMatch();
    };

    const nextBracketMatch = () => {
        if (state.value.bracketQueue.length === 0) {
            // Round Complete
            // If only 1 winner -> Results
            if (state.value.nextRoundQueue.length === 1) {
                state.value.winner = state.value.nextRoundQueue[0];
                state.value.phase = 'results';
                return;
            }

            // Setup next round
            state.value.round++;
            const survivors = [...state.value.nextRoundQueue];
            state.value.nextRoundQueue = [];

            // Create new matches
            state.value.bracketQueue = [];
            for (let i = 0; i < survivors.length; i += 2) {
                state.value.bracketQueue.push({
                    a: survivors[i],
                    b: survivors[i + 1]
                });
            }
        }

        state.value.currentMatch = state.value.bracketQueue.shift();
    };

    const resolveBracketMatch = (winnerId) => {
        const { a, b } = state.value.currentMatch;
        const winner = a.id === winnerId ? a : b;
        const loser = a.id === winnerId ? b : a;

        state.value.nextRoundQueue.push(winner);
        state.value.eliminatedDegrees.push({ ...loser, round: `bracket-${state.value.round}` });

        state.value.currentMatch = null;
        nextBracketMatch();
    };

    return {
        state,
        init,
        resetGame,
        goToRules,
        goToWelcome,
        goToDonate,
        startNewGame,
        removeCategory,
        completeCategories,
        restoreCategory,
        togglePhase1Selection,
        undoPhase1,
        completePhase1,
        resolvePhase2Match,
        resolvePhase2MatchRandomly,
        resolveBracketMatch,
        repairBracketState
    };
}
