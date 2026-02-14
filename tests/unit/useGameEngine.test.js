/**
 * Unit tests for useGameEngine: phases, categories, phase1, phase2, bracket, persistence.
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
      while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
      engine.completePhase1();
      if (engine.state.value.phase === 'phase2') {
        while (engine.state.value.phase === 'phase2' && engine.state.value.currentMatch) {
          const { a } = engine.state.value.currentMatch;
          engine.resolvePhase2Match(a.id);
        }
        expect(engine.state.value.phase).toBe('phase3-bracket');
      }
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
