import { useI18n } from 'vue-i18n';
import { useGameEngine } from './useGameEngine';
import { useSound } from './useSound';

/** "Back" from a game screen: asks before throwing the game away, then returns to the welcome screen. */
export function useLeaveGame() {
  const { t } = useI18n();
  const { resetGame } = useGameEngine();
  const { playTap } = useSound();

  const leaveGame = () => {
    playTap();
    if (window.confirm(t('common.confirm_leave'))) resetGame();
  };

  return { leaveGame };
}
