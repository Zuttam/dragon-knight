import { t } from '../i18n';
import type { RewardItem } from '../rewards/RewardItem';
import { generateRewardChoices } from '../rewards/RewardItem';

export class LevelCompleteOverlay {
  private container: HTMLElement | null = null;

  show(
    playerName: string,
    level: number,
    nextLevel: number,
    onContinue: (reward: RewardItem) => void,
    onMenu: () => void
  ): void {
    this.hide();

    const rewards = generateRewardChoices(nextLevel);
    let selectedReward: RewardItem | null = null;

    this.container = document.createElement('div');
    this.container.id = 'levelcomplete-overlay';

    const box = document.createElement('div');
    box.className = 'overlay-box victory';

    const title = document.createElement('h1');
    title.className = 'victory-title';
    title.textContent = t('levelComplete.title');

    const subtitle = document.createElement('p');
    subtitle.className = 'victory-subtitle';
    subtitle.textContent = t('levelComplete.subtitle', { level });

    const msg = document.createElement('p');
    msg.className = 'victory-msg';
    msg.textContent = t('levelComplete.message', { name: playerName });

    const rewardTitle = document.createElement('p');
    rewardTitle.className = 'reward-choose-title';
    rewardTitle.textContent = t('reward.chooseTitle');

    const cardsRow = document.createElement('div');
    cardsRow.className = 'reward-cards';

    const continueBtn = document.createElement('button');
    continueBtn.className = 'overlay-btn primary-btn';
    continueBtn.textContent = t('levelComplete.continue', { level: nextLevel });
    continueBtn.disabled = true;

    for (const reward of rewards) {
      const card = document.createElement('div');
      card.className = 'reward-card';

      const icon = document.createElement('div');
      icon.className = 'reward-card-icon';
      icon.textContent = reward.icon;

      const name = document.createElement('div');
      name.className = 'reward-card-name';
      name.textContent = reward.label;

      const desc = document.createElement('div');
      desc.className = 'reward-card-desc';
      desc.textContent = reward.description;

      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(desc);
      cardsRow.appendChild(card);

      card.addEventListener('click', () => {
        selectedReward = reward;
        cardsRow.querySelectorAll('.reward-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        continueBtn.disabled = false;
      });
    }

    const menuBtn = document.createElement('button');
    menuBtn.className = 'overlay-btn secondary-btn';
    menuBtn.textContent = t('levelComplete.mainMenu');

    box.appendChild(title);
    box.appendChild(subtitle);
    box.appendChild(msg);
    box.appendChild(rewardTitle);
    box.appendChild(cardsRow);
    box.appendChild(continueBtn);
    box.appendChild(menuBtn);
    this.container.appendChild(box);
    document.body.appendChild(this.container);

    continueBtn.addEventListener('click', () => {
      if (selectedReward) {
        this.hide();
        onContinue(selectedReward);
      }
    });
    menuBtn.addEventListener('click', () => { this.hide(); onMenu(); });
  }

  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
