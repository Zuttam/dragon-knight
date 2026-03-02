import type { WizardChatState } from '../systems/WizardChatSystem';
import type { LLMProvider } from '../save/SaveSystem';
import { t } from '../i18n';
import { MODELS_BY_PROVIDER } from '../config/constants';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class WizardChatOverlay {
  private container: HTMLElement | null = null;
  private messagesEl: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  private streamingTimer: number | null = null;
  private streamingIndex: number = 0;
  private streamedMessageCount: number = 0;
  private isStreaming: boolean = false;

  private onSend: (message: string) => void;
  private onClose: () => void;
  private onApiKeySubmit: (provider: LLMProvider, apiKey: string, model: string) => void;

  constructor(
    onSend: (message: string) => void,
    onClose: () => void,
    onApiKeySubmit: (provider: LLMProvider, apiKey: string, model: string) => void
  ) {
    this.onSend = onSend;
    this.onClose = onClose;
    this.onApiKeySubmit = onApiKeySubmit;
  }

  show(needsApiKey: boolean): void {
    this.hide();

    this.container = document.createElement('div');
    this.container.id = 'wizard-chat-overlay';

    if (needsApiKey) {
      this.showApiKeyPrompt();
    } else {
      this.showChatInterface();
    }

    document.body.appendChild(this.container);
  }

  private showApiKeyPrompt(): void {
    if (!this.container) return;

    const buildModelOptions = (provider: string) =>
      (MODELS_BY_PROVIDER[provider] || [])
        .map(m => `<option value="${m.id}">${m.label}</option>`)
        .join('');

    this.container.innerHTML = `
      <div class="wizard-chat-box wizard-apikey-box">
        <div class="wizard-chat-header">
          <span class="wizard-chat-title">${t('wizard.awaits')}</span>
          <button class="wizard-close-btn">&times;</button>
        </div>
        <p class="wizard-apikey-desc">${t('wizard.apiKeyDesc')}</p>
        <div class="wizard-provider-select">
          <label class="wizard-radio"><input type="radio" name="wizard-provider" value="anthropic" checked /> ${t('wizard.anthropicClaude')}</label>
          <label class="wizard-radio"><input type="radio" name="wizard-provider" value="openai" /> ${t('wizard.openai')}</label>
        </div>
        <input type="password" id="wizard-api-key-input" class="wizard-api-key-field" placeholder="${t('wizard.apiKeyPlaceholder')}" />
        <select id="wizard-model-select" class="wizard-api-key-field">${buildModelOptions('anthropic')}</select>
        <button id="wizard-submit-key" class="overlay-btn primary-btn">${t('wizard.connect')}</button>
      </div>
    `;

    this.container.querySelector('.wizard-close-btn')?.addEventListener('click', () => this.onClose());

    const submitBtn = this.container.querySelector('#wizard-submit-key') as HTMLButtonElement;
    const apiKeyInput = this.container.querySelector('#wizard-api-key-input') as HTMLInputElement;
    const modelSelect = this.container.querySelector('#wizard-model-select') as HTMLSelectElement;

    // Swap model list when provider changes
    const providerRadios = this.container.querySelectorAll<HTMLInputElement>('input[name="wizard-provider"]');
    for (const radio of providerRadios) {
      radio.addEventListener('change', () => {
        modelSelect.innerHTML = buildModelOptions(radio.value);
      });
    }

    const submit = () => {
      const key = apiKeyInput.value.trim();
      if (!key) return;
      const providerRadio = this.container!.querySelector('input[name="wizard-provider"]:checked') as HTMLInputElement;
      const provider = (providerRadio?.value || 'anthropic') as LLMProvider;
      const model = modelSelect.value;
      this.onApiKeySubmit(provider, key, model);
    };

    submitBtn.addEventListener('click', submit);
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.onClose();
      }
    };
    window.addEventListener('keydown', this.keydownHandler, true);

    apiKeyInput.focus();
  }

  private showChatInterface(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="wizard-chat-box">
        <div class="wizard-chat-header">
          <span class="wizard-chat-title">${t('wizard.title')}</span>
          <div class="wizard-header-actions">
            <button class="wizard-settings-btn" title="${t('wizard.changeApiKey')}">&#9881;</button>
            <button class="wizard-close-btn">&times;</button>
          </div>
        </div>
        <div class="wizard-messages" id="wizard-messages"></div>
        <div class="wizard-status" id="wizard-status"></div>
        <div class="wizard-input-row">
          <input type="text" id="wizard-chat-input" class="wizard-chat-field" placeholder="${t('wizard.chatPlaceholder')}" maxlength="500" />
          <button id="wizard-send-btn" class="wizard-send-btn">${t('wizard.send')}</button>
        </div>
      </div>
    `;

    this.messagesEl = this.container.querySelector('#wizard-messages');
    this.inputEl = this.container.querySelector('#wizard-chat-input') as HTMLInputElement;
    this.sendBtn = this.container.querySelector('#wizard-send-btn') as HTMLButtonElement;
    this.statusEl = this.container.querySelector('#wizard-status');

    this.container.querySelector('.wizard-close-btn')?.addEventListener('click', () => this.onClose());
    this.container.querySelector('.wizard-settings-btn')?.addEventListener('click', () => {
      this.showApiKeyPrompt();
    });

    const sendMessage = () => {
      if (!this.inputEl) return;
      const msg = this.inputEl.value.trim();
      if (!msg) return;
      this.inputEl.value = '';
      this.onSend(msg);
    };

    this.sendBtn.addEventListener('click', sendMessage);
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
      e.stopPropagation();
    });

    // Stop other key events from propagating to game
    this.inputEl.addEventListener('keyup', (e) => e.stopPropagation());
    this.inputEl.addEventListener('keypress', (e) => e.stopPropagation());

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.onClose();
      }
    };
    window.addEventListener('keydown', this.keydownHandler, true);

    this.inputEl.focus();
  }

  updateMessages(chatState: WizardChatState): void {
    if (!this.messagesEl) return;

    const messages = chatState.messages;
    const lastMsg = messages[messages.length - 1];
    const isNewWizardMsg =
      lastMsg &&
      lastMsg.role === 'wizard' &&
      messages.length > this.streamedMessageCount;

    // Render all messages except the last one (if it's a new wizard msg to stream)
    let html = '';
    const renderCount = isNewWizardMsg ? messages.length - 1 : messages.length;
    for (let i = 0; i < renderCount; i++) {
      const msg = messages[i];
      const cssClass = msg.role === 'wizard' ? 'wizard-msg-wizard' : 'wizard-msg-knight';
      const label = msg.role === 'wizard' ? t('wizard.labelWizard') : t('wizard.labelYou');
      const content = escapeHtml(msg.content.replace(/\[CORRECT\]/g, '').trim());
      html += `<div class="wizard-msg ${cssClass}"><span class="wizard-msg-label">${label}:</span> ${content}</div>`;
    }

    if (isNewWizardMsg) {
      // Add a placeholder div for the streaming message
      html += `<div class="wizard-msg wizard-msg-wizard wizard-msg-streaming" id="wizard-streaming-msg"><span class="wizard-msg-label">${t('wizard.labelWizard')}:</span> <span id="wizard-streaming-text"></span></div>`;
      this.messagesEl.innerHTML = html;
      this.startStreaming(lastMsg.content.replace(/\[CORRECT\]/g, '').trim(), messages.length);
    } else if (!this.isStreaming) {
      // No streaming in progress - render all messages normally
      this.messagesEl.innerHTML = html;
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    // Status
    if (this.statusEl) {
      if (chatState.error) {
        this.statusEl.textContent = chatState.error;
        this.statusEl.className = 'wizard-status wizard-status-error';
      } else if (chatState.isWaiting) {
        this.statusEl.textContent = t('wizard.ponders');
        this.statusEl.className = 'wizard-status wizard-status-waiting';
      } else if (chatState.riddleCorrect) {
        this.statusEl.textContent = t('wizard.gift');
        this.statusEl.className = 'wizard-status wizard-status-correct';
      } else {
        this.statusEl.textContent = '';
        this.statusEl.className = 'wizard-status';
      }
    }

    // Disable input while waiting or streaming
    const disableInput = chatState.isWaiting || chatState.riddleCorrect || this.isStreaming;
    if (this.inputEl) {
      this.inputEl.disabled = disableInput;
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = disableInput;
    }
  }

  private startStreaming(fullText: string, messageCount: number): void {
    this.cancelStreaming();
    this.streamingIndex = 0;
    this.isStreaming = true;

    const textEl = this.messagesEl?.querySelector('#wizard-streaming-text');
    if (!textEl) return;

    const streamChar = () => {
      if (this.streamingIndex >= fullText.length) {
        // Streaming complete
        this.cancelStreaming();
        this.streamedMessageCount = messageCount;
        this.isStreaming = false;

        // Remove streaming class (removes blinking cursor)
        const streamingMsg = this.messagesEl?.querySelector('#wizard-streaming-msg');
        if (streamingMsg) {
          streamingMsg.classList.remove('wizard-msg-streaming');
          streamingMsg.removeAttribute('id');
        }
        const streamingTextEl = this.messagesEl?.querySelector('#wizard-streaming-text');
        if (streamingTextEl) {
          streamingTextEl.removeAttribute('id');
        }

        // Re-enable input
        if (this.inputEl) {
          this.inputEl.disabled = false;
          this.inputEl.focus();
        }
        if (this.sendBtn) {
          this.sendBtn.disabled = false;
        }
        return;
      }

      // Append next character (use textContent to avoid HTML injection)
      this.streamingIndex++;
      textEl.textContent = fullText.slice(0, this.streamingIndex);

      // Auto-scroll
      if (this.messagesEl) {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }

      this.streamingTimer = window.setTimeout(streamChar, 30);
    };

    streamChar();
  }

  private cancelStreaming(): void {
    if (this.streamingTimer !== null) {
      clearTimeout(this.streamingTimer);
      this.streamingTimer = null;
    }
  }

  hide(): void {
    this.cancelStreaming();
    this.isStreaming = false;
    this.streamedMessageCount = 0;
    this.streamingIndex = 0;

    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.messagesEl = null;
    this.inputEl = null;
    this.sendBtn = null;
    this.statusEl = null;
  }
}
