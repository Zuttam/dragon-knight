import { PowerUpType } from '../state/EntityState';
import { t } from '../i18n';

export interface RewardItem {
  type: PowerUpType;
  label: string;
  description: string;
  icon: string;
  value: number;
}

const REWARD_ICONS: Record<PowerUpType, string> = {
  [PowerUpType.HEAL]: '\u2764\uFE0F',
  [PowerUpType.ATTACK_BOOST]: '\u2694\uFE0F',
  [PowerUpType.SPEED_BOOST]: '\u26A1',
  [PowerUpType.SHADOW_CLOAK]: '\uD83D\uDC7B',
  [PowerUpType.FIRE_RESIST]: '\uD83D\uDEE1\uFE0F',
  [PowerUpType.HP_BOOST]: '\uD83D\uDC9A',
};

function computeRewardValue(type: PowerUpType, nextLevel: number): number {
  switch (type) {
    case PowerUpType.HEAL:
      return 40 + nextLevel * 10;
    case PowerUpType.ATTACK_BOOST:
      return +(1.3 + nextLevel * 0.05).toFixed(2);
    case PowerUpType.SPEED_BOOST:
      return +(1.25 + nextLevel * 0.03).toFixed(2);
    case PowerUpType.SHADOW_CLOAK:
      return 0;
    case PowerUpType.FIRE_RESIST:
      return 0.7;
    case PowerUpType.HP_BOOST:
      return 25 + nextLevel * 5;
  }
}

function buildRewardItem(type: PowerUpType, nextLevel: number): RewardItem {
  const value = computeRewardValue(type, nextLevel);
  return {
    type,
    label: t(`reward.${type}.label` as any),
    description: t(`reward.${type}.desc` as any, { value }),
    icon: REWARD_ICONS[type],
    value,
  };
}

export function generateRewardChoices(nextLevel: number): RewardItem[] {
  const allTypes = [
    PowerUpType.HEAL,
    PowerUpType.ATTACK_BOOST,
    PowerUpType.SPEED_BOOST,
    PowerUpType.SHADOW_CLOAK,
    PowerUpType.FIRE_RESIST,
    PowerUpType.HP_BOOST,
  ];

  // Fisher-Yates shuffle
  for (let i = allTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTypes[i], allTypes[j]] = [allTypes[j], allTypes[i]];
  }

  return allTypes.slice(0, 3).map(type => buildRewardItem(type, nextLevel));
}
