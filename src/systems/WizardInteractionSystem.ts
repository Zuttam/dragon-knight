import { WizardState, WizardDialogStatus, DragonStateData, KnightState, DragonAIState } from '../state/EntityState';
import { distance } from '../core/MathUtils';
import {
  WIZARD_INTERACTION_RANGE,
  WIZARD_DRAGON_SAFETY_RANGE,
  WIZARD_VISIBILITY_RANGE,
} from '../config/constants';

export class WizardInteractionSystem {
  private previousStatus: WizardDialogStatus = WizardDialogStatus.HIDDEN;

  /**
   * Updates wizard dialog status based on proximity and dragon safety.
   * Returns true when wizard first becomes AVAILABLE (for HUD prompt trigger).
   */
  update(wizard: WizardState, knight: KnightState, dragon: DragonStateData): boolean {
    if (wizard.riddleAnswered) {
      wizard.dialogStatus = WizardDialogStatus.COMPLETED;
      return false;
    }

    if (wizard.dialogStatus === WizardDialogStatus.CHATTING) {
      // Don't change status while chatting — use isChatSafe() separately
      return false;
    }

    const distToKnight = distance(wizard.x, wizard.y, knight.x, knight.y);
    const distToDragon = distance(wizard.x, wizard.y, dragon.x, dragon.y);
    const dragonIsAggressive = dragon.aiState === DragonAIState.ATTACK || dragon.aiState === DragonAIState.ALERT;
    const dragonNearby = distToDragon < WIZARD_DRAGON_SAFETY_RANGE || dragonIsAggressive;

    let newStatus: WizardDialogStatus;

    if (dragonNearby && distToKnight <= WIZARD_VISIBILITY_RANGE) {
      newStatus = WizardDialogStatus.DRAGON_NEARBY;
    } else if (distToKnight <= WIZARD_INTERACTION_RANGE) {
      newStatus = dragonNearby ? WizardDialogStatus.DRAGON_NEARBY : WizardDialogStatus.AVAILABLE;
    } else if (distToKnight <= WIZARD_VISIBILITY_RANGE) {
      newStatus = WizardDialogStatus.REVEALED;
    } else {
      newStatus = WizardDialogStatus.HIDDEN;
    }

    const justBecameAvailable =
      newStatus === WizardDialogStatus.AVAILABLE &&
      this.previousStatus !== WizardDialogStatus.AVAILABLE;

    this.previousStatus = newStatus;
    wizard.dialogStatus = newStatus;

    return justBecameAvailable;
  }

  /**
   * Check if an active chat should be interrupted because the dragon approached.
   */
  isChatSafe(wizard: WizardState, dragon: DragonStateData): boolean {
    const distToDragon = distance(wizard.x, wizard.y, dragon.x, dragon.y);
    const dragonIsAggressive = dragon.aiState === DragonAIState.ATTACK || dragon.aiState === DragonAIState.ALERT;
    return distToDragon >= WIZARD_DRAGON_SAFETY_RANGE && !dragonIsAggressive;
  }
}
