/**
 * Unit tests for useGameEngine: phases, categories, phase1, phase2, bracket, persistence.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import { useDataStore } from '../../src/composables/useDataStore';

describe('useGameEngine', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
  });

  describe('navigation', () => {
    it('resetGame sets phase to welcome and clears state', () => {
      engine.startNewGame();
      engine.resetGame();
      expect(engine.state.value.phase).toBe('welcome');
      expect(engine.state.value.survivingDegrees).toEqual([]);
      expect(engine.state.value.eliminatedDegrees).toEqual([]);
    });

    it('goToRules sets phase to rules', () => {
      engine.goToRules();
      expect(engine.state.value.phase).toBe('rules');
    });

    it('goToWelcome sets phase to welcome', () => {
      engine.goToRules();
      engine.goToWelcome();
      expect(engine.state.value.phase).toBe('welcome');
    });
  });

  describe('categories phase', () => {
    beforeEach(() => {
      engine.startNewGame();
    });

    it('startNewGame sets phase to categories and populates survivingDegrees', () => {
      expect(engine.state.value.phase).toBe('categories');
      expect(engine.state.value.survivingDegrees.length).toBeGreaterThan(0);
      expect(engine.state.value.eliminatedDegrees).toEqual([]);
    });

    it('removeCategory removes degrees of that category', () => {
      const surviving = engine.state.value.survivingDegrees;
      const firstCategory = surviving[0].category;
      const countBefore = surviving.filter((d) => d.category === firstCategory).length;
      engine.removeCategory(firstCategory);
      expect(engine.state.value.survivingDegrees.filter((d) => d.category === firstCategory).length).toBe(0);
      const eliminated = engine.state.value.eliminatedDegrees.filter((d) => d.round === 'categories' && d.category === firstCategory);
      expect(eliminated.length).toBe(countBefore);
    });

    it('restoreCategory restores previously removed category', () => {
      const surviving = engine.state.value.survivingDegrees;
      const firstCategory = surviving[0].category;
      const nBefore = engine.state.value.survivingDegrees.length;
      engine.removeCategory(firstCategory);
      const nAfterRemove = engine.state.value.survivingDegrees.length;
      const rest = engine.restoreCategory(firstCategory);
      expect(rest.success).toBe(true);
      expect(engine.state.value.survivingDegrees.length).toBe(nAfterRemove + (nBefore - nAfterRemove));
    });

    it('restoreCategory returns success false when nothing to restore', () => {
      engine.startNewGame();
      const result = engine.restoreCategory('NonExistentCategory');
      expect(result.success).toBe(false);
    });

    it('restoreCategory returns success false when not in categories phase', () => {
      engine.startNewGame();
      engine.completeCategories();
      expect(engine.restoreCategory('STEM').success).toBe(false);
    });

    it('removeCategory is no-op when not in categories phase', () => {
      engine.startNewGame();
      engine.completeCategories();
      const len = engine.state.value.survivingDegrees.length;
      engine.removeCategory('STEM');
      expect(engine.state.value.survivingDegrees.length).toBe(len);
    });

    it('completeCategories when not in categories phase returns success false', () => {
      engine.resetGame();
      expect(engine.completeCategories().success).toBe(false);
    });

    it('completeCategories with at least 2 survivors returns success and goes to phase1', () => {
      const result = engine.completeCategories();
      expect(result.success).toBe(true);
      expect(engine.state.value.phase).toBe('phase1');
    });
  });

  describe('phase1', () => {
    beforeEach(() => {
      engine.startNewGame();
      engine.completeCategories();
    });

    it('completePhase1 with at least 2 survivors succeeds', () => {
      const result = engine.completePhase1();
      expect(result.success).toBe(true);
    });

    it('completePhase1 with fewer than 2 survivors returns success false', () => {
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 1) engine.togglePhase1Selection(surv[surv.length - 1].id);
      const result = engine.completePhase1();
      expect(result.success).toBe(false);
    });

    it('completePhase1 with power of 2 survivors goes directly to bracket', () => {
      const surv = engine.state.value.survivingDegrees;
      const target = 8;
      while (surv.length > target) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      expect(engine.state.value.phase).toBe('phase3-bracket');
      expect(engine.state.value.bracketTotal).toBe(target);
    });

    it('completePhase1 with non-power-of-2 survivors goes to phase2', () => {
      const surv = engine.state.value.survivingDegrees;
      const target = 12;
      while (surv.length > target) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      expect(engine.state.value.phase).toBe('phase2');
      expect(engine.state.value.phase2TotalPairs).toBeGreaterThan(0);
    });

    it('togglePhase1Selection moves degree between surviving and eliminated', () => {
      const id = engine.state.value.survivingDegrees[0].id;
      engine.togglePhase1Selection(id);
      expect(engine.state.value.survivingDegrees.some((d) => d.id === id)).toBe(false);
      expect(engine.state.value.eliminatedDegrees.some((d) => d.id === id)).toBe(true);
      engine.togglePhase1Selection(id);
      expect(engine.state.value.survivingDegrees.some((d) => d.id === id)).toBe(true);
    });

    it('undoPhase1 restores last eliminated degree', () => {
      const id = engine.state.value.survivingDegrees[0].id;
      engine.togglePhase1Selection(id);
      const result = engine.undoPhase1();
      expect(result.success).toBe(true);
      expect(engine.state.value.survivingDegrees.some((d) => d.id === id)).toBe(true);
    });

    it('undoPhase1 returns success false when eliminated is empty', () => {
      const result = engine.undoPhase1();
      expect(result.success).toBe(false);
    });

    it('undoPhase1 returns success false when not in phase1', () => {
      engine.startNewGame();
      const result = engine.undoPhase1();
      expect(result.success).toBe(false);
    });
  });

  describe('bracket phase', () => {
    /** Get to bracket with exactly 4 survivors (2 rounds: 2 matches then 1 final). */
    function goToBracketWithFour() {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) {
        engine.togglePhase1Selection(surv[surv.length - 1].id);
      }
      engine.completePhase1();
      expect(engine.state.value.phase).toBe('phase3-bracket');
      expect(engine.state.value.bracketTotal).toBe(4);
    }

    it('starts bracket with currentMatch and bracketQueue', () => {
      goToBracketWithFour();
      expect(engine.state.value.currentMatch).not.toBeNull();
      expect(engine.state.value.bracketQueue.length).toBe(1);
    });

    it('resolveBracketMatch advances and eventually sets phase to results', () => {
      goToBracketWithFour();
      while (engine.state.value.phase === 'phase3-bracket' && engine.state.value.currentMatch) {
        const { a } = engine.state.value.currentMatch;
        engine.resolveBracketMatch(a.id);
      }
      expect(engine.state.value.phase).toBe('results');
      expect(engine.state.value.winner).not.toBeNull();
    });
  });

  describe('init and persistence', () => {
    it('init restores valid saved state', () => {
      engine.startNewGame();
      engine.completeCategories();
      const snapshot = JSON.parse(JSON.stringify(engine.state.value));
      engine.resetGame();
      useDataStore().save(snapshot);
      engine.init();
      expect(engine.state.value.phase).toBe('phase1');
      expect(engine.state.value.survivingDegrees.length).toBe(snapshot.survivingDegrees.length);
    });

    it('init ignores invalid saved state and keeps default', () => {
      useDataStore().save({ phase: 'invalid-phase', survivingDegrees: [], eliminatedDegrees: [] });
      engine.init();
      expect(engine.state.value.phase).toBe('welcome');
    });

    it('saves ids only, not whole degree objects', async () => {
      engine.startNewGame();
      engine.completeCategories();
      await nextTick();
      const raw = JSON.parse(localStorage.getItem('pick-my-degree-v1'));
      expect(raw.v).toBe(2);
      expect(typeof raw.survivingDegrees[0]).toBe('string');
    });

    it('round-trips a game in progress through the id-based save', async () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 8) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      engine.resolveBracketMatch(engine.state.value.currentMatch.a.id);
      await nextTick();
      const expected = JSON.parse(JSON.stringify(engine.state.value));
      engine.init();
      expect(JSON.parse(JSON.stringify(engine.state.value))).toEqual(expected);
    });

    it('ignores a save from a newer schema version', () => {
      useDataStore().save({ v: 99, phase: 'phase1', survivingDegrees: ['deg-001', 'deg-002'], eliminatedDegrees: [] });
      engine.init();
      expect(engine.state.value.phase).toBe('welcome');
    });

    it('drops ids that no longer exist in degrees.json, and resets when nothing is left', () => {
      useDataStore().save({ v: 2, phase: 'phase1', survivingDegrees: ['deg-001', 'gone-1', 'gone-2'], eliminatedDegrees: [] });
      engine.init();
      expect(engine.state.value.survivingDegrees.map((d) => d.id)).toEqual(['deg-001']);
      engine.resetGame();
      useDataStore().save({ v: 2, phase: 'phase1', survivingDegrees: ['gone-1'], eliminatedDegrees: [] });
      engine.init();
      expect(engine.state.value.phase).toBe('welcome');
    });

    it('picks up edits to a degree after reload (text is not stored)', () => {
      useDataStore().save({ v: 2, phase: 'phase1', survivingDegrees: ['deg-001', 'deg-002'], eliminatedDegrees: [] });
      engine.init();
      expect(engine.state.value.survivingDegrees[0].name.it).toBeTruthy();
    });

    it('init repairs phase2 saved without a current match', async () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      await nextTick();
      const raw = JSON.parse(localStorage.getItem('pick-my-degree-v1'));
      raw.currentMatch = null;
      engine.resetGame();
      useDataStore().save(raw);
      engine.init();
      expect(engine.state.value.phase).toBe('phase2');
      expect(engine.state.value.currentMatch).not.toBeNull();
    });

    it('init resets an unrecoverable bracket save instead of leaving a frozen screen', () => {
      useDataStore().save({ v: 2, phase: 'phase3-bracket', survivingDegrees: ['deg-001'], eliminatedDegrees: [], bracketTotal: 1 });
      engine.init();
      expect(engine.state.value.phase).toBe('welcome');
    });

    it('init with phase3-bracket saved state calls repairBracketState', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      const snapshot = JSON.parse(JSON.stringify(engine.state.value));
      snapshot.currentMatch = null;
      snapshot.bracketQueue = [];
      engine.resetGame();
      useDataStore().save(snapshot);
      engine.init();
      expect(engine.state.value.phase).toBe('phase3-bracket');
      expect(engine.state.value.currentMatch).not.toBeNull();
    });
  });

  describe('phase2', () => {
    it('phase2 resolvePhase2Match keeps winner and eliminates loser', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      expect(engine.state.value.phase).toBe('phase2');
      const { a, b } = engine.state.value.currentMatch;
      const winnerId = a.id;
      engine.resolvePhase2Match(winnerId);
      expect(engine.state.value.eliminatedDegrees.some((d) => d.id === b.id)).toBe(true);
      expect(engine.state.value.nextRoundQueue.some((d) => d.id === winnerId)).toBe(true);
    });

    it('phase2 completes and enters bracket when queue empty', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      // 6 survivors is not a power of 2, so this must go through phase 2 (2 pairs, 4 left).
      expect(engine.state.value.phase).toBe('phase2');
      while (engine.state.value.phase === 'phase2' && engine.state.value.currentMatch) {
        const { a } = engine.state.value.currentMatch;
        engine.resolvePhase2Match(a.id);
      }
      expect(engine.state.value.phase).toBe('phase3-bracket');
      expect(engine.state.value.bracketTotal).toBe(4);
    });

    it('resolvePhase2MatchRandomly keeps one of the two degrees', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      const { a, b } = engine.state.value.currentMatch;
      const kept = engine.resolvePhase2MatchRandomly();
      expect([a.id, b.id]).toContain(kept.id);
      expect(engine.state.value.nextRoundQueue.some((d) => d.id === kept.id)).toBe(true);
    });

    it('ignores a second resolve with an id that is not in the current match', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      const { a } = engine.state.value.currentMatch;
      expect(engine.resolvePhase2Match(a.id)).toBe(true);
      const eliminatedBefore = engine.state.value.eliminatedDegrees.length;
      // Stale tap on the card that was already resolved: must be a no-op, not a random pick.
      expect(engine.resolvePhase2Match(a.id)).toBe(false);
      expect(engine.state.value.eliminatedDegrees.length).toBe(eliminatedBefore);
    });

    it('resolvePhase2Match and resolvePhase2MatchRandomly are no-ops with no live match', () => {
      expect(engine.resolvePhase2Match('deg-001')).toBe(false);
      expect(engine.resolvePhase2MatchRandomly()).toBeNull();
    });
  });

  describe('double resolve guards', () => {
    function toBracketWithFour() {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
    }

    it('resolveBracketMatch ignores an id outside the current match', () => {
      toBracketWithFour();
      const before = engine.state.value.currentMatch;
      expect(engine.resolveBracketMatch('not-in-match')).toBe(false);
      expect(engine.state.value.currentMatch).toEqual(before);
      expect(engine.state.value.eliminatedDegrees.filter((d) => d.round.startsWith('bracket')).length).toBe(0);
    });

    it('resolveBracketMatch does not throw after the final match and ignores a late tap', () => {
      toBracketWithFour();
      let last;
      while (engine.state.value.phase === 'phase3-bracket') {
        last = engine.state.value.currentMatch;
        engine.resolveBracketMatch(last.a.id);
      }
      expect(engine.state.value.phase).toBe('results');
      expect(() => engine.resolveBracketMatch(last.a.id)).not.toThrow();
      expect(engine.resolveBracketMatch(last.a.id)).toBe(false);
    });
  });

  describe('replay and undo', () => {
    it('startNewGame clears leftovers from a finished game', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      while (engine.state.value.phase === 'phase3-bracket') {
        engine.resolveBracketMatch(engine.state.value.currentMatch.a.id);
      }
      expect(engine.state.value.winner).not.toBeNull();
      engine.startNewGame();
      const s = engine.state.value;
      expect(s.phase).toBe('categories');
      expect(s.winner).toBeNull();
      expect(s.currentMatch).toBeNull();
      expect(s.bracketQueue).toEqual([]);
      expect(s.nextRoundQueue).toEqual([]);
      expect(s.phase2Queue).toEqual([]);
      expect(s.bracketTotal).toBe(0);
      expect(s.phase2TotalPairs).toBe(0);
      expect(s.round).toBe(1);
    });

    it('undoPhase1 never brings back a degree removed with its category', () => {
      engine.startNewGame();
      const category = engine.state.value.survivingDegrees[0].category;
      engine.removeCategory(category);
      engine.completeCategories();
      expect(engine.undoPhase1().success).toBe(false);
      const id = engine.state.value.survivingDegrees[0].id;
      engine.togglePhase1Selection(id);
      expect(engine.undoPhase1().success).toBe(true);
      expect(engine.state.value.survivingDegrees.some((d) => d.id === id)).toBe(true);
      expect(engine.state.value.survivingDegrees.some((d) => d.category === category)).toBe(false);
    });

    it('completePhase1 is ignored outside phase1', () => {
      engine.startNewGame();
      expect(engine.completePhase1().success).toBe(false);
      expect(engine.state.value.phase).toBe('categories');
    });

    it('completeCategories and completePhase1 report a message key for the UI to translate', () => {
      engine.startNewGame();
      const surv = engine.state.value.survivingDegrees;
      const categories = [...new Set(surv.map((d) => d.category))];
      categories.slice(1).forEach((c) => engine.removeCategory(c));
      engine.completeCategories();
      while (engine.state.value.survivingDegrees.length > 1) {
        engine.togglePhase1Selection(engine.state.value.survivingDegrees[0].id);
      }
      expect(engine.completePhase1()).toEqual({ success: false, messageKey: 'errors.keep_at_least_two' });
    });
  });

  describe('repairBracketState', () => {
    it('rebuilds currentMatch from bracketQueue when queue has items', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      expect(engine.state.value.currentMatch).not.toBeNull();
      const state = engine.state.value;
      state.currentMatch = null;
      state.bracketQueue = [];
      engine.repairBracketState();
      expect(engine.state.value.currentMatch).not.toBeNull();
    });

    it('repairBracketState from start of bracket builds queue from survivingDegrees', () => {
      engine.startNewGame();
      engine.completeCategories();
      const surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      const state = engine.state.value;
      state.currentMatch = null;
      state.bracketQueue = [];
      state.nextRoundQueue = [];
      engine.repairBracketState();
      expect(engine.state.value.currentMatch).not.toBeNull();
      expect(engine.state.value.bracketQueue.length).toBe(1);
    });

    it('repairBracketState between rounds builds queue from nextRoundQueue', () => {
      engine.startNewGame();
      engine.completeCategories();
      let surv = engine.state.value.survivingDegrees;
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      const { a } = engine.state.value.currentMatch;
      engine.resolveBracketMatch(a.id);
      engine.resolveBracketMatch(engine.state.value.currentMatch.a.id);
      const state = engine.state.value;
      state.currentMatch = null;
      state.bracketQueue = [];
      engine.repairBracketState();
      expect(engine.state.value.currentMatch).not.toBeNull();
    });
  });
});
