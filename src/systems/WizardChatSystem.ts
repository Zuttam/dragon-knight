import type { SupportedLanguage, AgeRange, LLMProvider, UserSettings } from '../save/SaveSystem';
import { t } from '../i18n';

export interface ChatMessage {
  role: 'wizard' | 'knight';
  content: string;
  timestamp: number;
}

export interface WizardChatState {
  messages: ChatMessage[];
  isWaiting: boolean;
  riddleGenerated: boolean;
  riddleCorrect: boolean;
  error: string | null;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean',
  zh: 'Chinese', ar: 'Arabic', he: 'Hebrew', ru: 'Russian',
};

export class WizardChatSystem {
  private provider: LLMProvider = 'anthropic';
  private apiKey: string = '';
  private model: string = '';
  private conversationHistory: { role: string; content: string }[] = [];
  private systemPrompt: string = '';
  private abortController: AbortController | null = null;
  state: WizardChatState = this.createFreshState();

  private createFreshState(): WizardChatState {
    return {
      messages: [],
      isWaiting: false,
      riddleGenerated: false,
      riddleCorrect: false,
      error: null,
    };
  }

  setProvider(provider: LLMProvider, apiKey: string, model?: string): void {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || '';
  }

  loadFromSettings(settings: UserSettings): boolean {
    if (settings.llmProvider && settings.llmApiKey) {
      this.provider = settings.llmProvider;
      this.apiKey = settings.llmApiKey;
      this.model = settings.llmModel || '';
      return true;
    }
    return false;
  }

  private getModel(): string {
    if (this.model) return this.model;
    return this.provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o-mini';
  }

  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  async startChat(level: number, language: SupportedLanguage, ageRange: AgeRange): Promise<void> {
    this.state = this.createFreshState();
    this.conversationHistory = [];

    const langName = LANGUAGE_NAMES[language] || 'English';
    const difficultyDesc = level <= 2 ? 'easy' : level <= 5 ? 'moderate' : 'challenging';
    const ageGuidance = ageRange === 'child'
      ? 'The player is a young child (under 13). Use simple vocabulary and concrete concepts. The riddle should be easy and playful — think animals, colors, everyday objects in a castle. Avoid abstract thinking or wordplay that requires advanced literacy.'
      : ageRange === 'teen'
      ? 'The player is a teenager. The riddle can use moderate wordplay, logic, or lateral thinking. Fantasy-themed riddles about mythical creatures, elements, or dungeon lore work well.'
      : 'The player is an adult. Feel free to use clever wordplay, double meanings, lateral thinking, or more obscure fantasy/mythology references.';

    this.systemPrompt = `You are a mysterious ancient wizard hiding in a dungeon. You speak in ${langName}. A brave knight has found you. You must:
1. Stay in character as an ancient, wise, slightly mysterious wizard
2. Pose exactly ONE riddle at ${difficultyDesc} difficulty. ${ageGuidance}
3. The riddle should be fun and related to the fantasy dungeon setting
4. If the knight asks for a hint, give a subtle clue without revealing the answer
5. When the knight gives the correct answer, respond with praise and include the marker [CORRECT] at the end of your message
6. Be patient and encouraging if they get it wrong
7. Keep responses concise (2-4 sentences max)
8. All your responses must be in ${langName}

Start by introducing yourself briefly and presenting your riddle.`;

    this.state.isWaiting = true;

    try {
      const response = await this.callLLM([]);
      this.state.messages.push({
        role: 'wizard',
        content: response,
        timestamp: Date.now(),
      });
      this.state.riddleGenerated = true;
      this.conversationHistory.push({ role: 'assistant', content: response });
    } catch (err: any) {
      this.state.error = err.message || t('wizard.connectionLost');
    } finally {
      this.state.isWaiting = false;
    }
  }

  async sendMessage(knightMessage: string): Promise<void> {
    if (this.state.isWaiting || this.state.riddleCorrect) return;

    this.state.messages.push({
      role: 'knight',
      content: knightMessage,
      timestamp: Date.now(),
    });
    this.conversationHistory.push({ role: 'user', content: knightMessage });

    this.state.isWaiting = true;
    this.state.error = null;

    try {
      const response = await this.callLLM(this.conversationHistory);

      this.state.messages.push({
        role: 'wizard',
        content: response,
        timestamp: Date.now(),
      });
      this.conversationHistory.push({ role: 'assistant', content: response });

      if (response.includes('[CORRECT]')) {
        this.state.riddleCorrect = true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.state.error = err.message || t('wizard.connectionLost');
    } finally {
      this.state.isWaiting = false;
    }
  }

  cancelPending(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state.isWaiting = false;
  }

  private async callLLM(history: { role: string; content: string }[]): Promise<string> {
    this.abortController = new AbortController();

    if (this.provider === 'anthropic') {
      return this.callAnthropic(history);
    } else {
      return this.callOpenAI(history);
    }
  }

  private async callAnthropic(history: { role: string; content: string }[]): Promise<string> {
    const messages = history.map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.getModel(),
        max_tokens: 300,
        system: this.systemPrompt,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Begin.' }],
      }),
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${t('wizard.spellFailed')} (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || t('wizard.mumbles');
  }

  private async callOpenAI(history: { role: string; content: string }[]): Promise<string> {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: this.systemPrompt },
    ];

    if (history.length === 0) {
      messages.push({ role: 'user', content: 'Begin.' });
    } else {
      for (const m of history) {
        messages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.getModel(),
        max_completion_tokens: 300,
        messages,
      }),
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${t('wizard.spellFailed')} (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || t('wizard.mumbles');
  }
}
