import { STORAGE_KEYS } from '../constants'
import type {
  PlaygroundConfig,
  ParameterEnabled,
  Message,
  Conversation,
} from '../types'
import { sanitizeMessagesOnLoad } from './message-utils'

/**
 * Load playground config from localStorage
 */
export function loadConfig(): Partial<PlaygroundConfig> {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load config:', error)
  }
  return {}
}

/**
 * Save playground config to localStorage
 */
export function saveConfig(config: Partial<PlaygroundConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save config:', error)
  }
}

/**
 * Load parameter enabled state from localStorage
 */
export function loadParameterEnabled(): Partial<ParameterEnabled> {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PARAMETER_ENABLED)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load parameter enabled:', error)
  }
  return {}
}

/**
 * Save parameter enabled state to localStorage
 */
export function saveParameterEnabled(
  parameterEnabled: Partial<ParameterEnabled>
): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.PARAMETER_ENABLED,
      JSON.stringify(parameterEnabled)
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save parameter enabled:', error)
  }
}

/**
 * Load messages from localStorage
 */
export function loadMessages(): Message[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    if (saved) {
      const parsed: Message[] = JSON.parse(saved)
      const sanitized = sanitizeMessagesOnLoad(parsed)
      // Persist sanitized result to avoid re-sanitizing on subsequent loads
      if (sanitized !== parsed) {
        saveMessages(sanitized)
      }
      return sanitized
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load messages:', error)
  }
  return null
}

/**
 * Save messages to localStorage
 */
export function saveMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save messages:', error)
  }
}

/**
 * Clear all playground data
 */
export function clearPlaygroundData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONFIG)
    localStorage.removeItem(STORAGE_KEYS.PARAMETER_ENABLED)
    localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS)
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear playground data:', error)
  }
}

/**
 * Load all conversations from localStorage.
 * Migrates legacy single-messages storage into a single conversation.
 */
export function loadConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
    if (saved) {
      const parsed: Conversation[] = JSON.parse(saved)
      return parsed.map((c) => ({
        ...c,
        messages: sanitizeMessagesOnLoad(c.messages || []),
      }))
    }

    // Migrate legacy messages storage
    const legacy = loadMessages()
    if (legacy && legacy.length > 0) {
      const now = Date.now()
      const migrated: Conversation = {
        id: `conv-${now}`,
        title: deriveConversationTitle(legacy),
        messages: legacy,
        createdAt: now,
        updatedAt: now,
      }
      saveConversations([migrated])
      saveActiveConversationId(migrated.id)
      localStorage.removeItem(STORAGE_KEYS.MESSAGES)
      return [migrated]
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load conversations:', error)
  }
  return []
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CONVERSATIONS,
      JSON.stringify(conversations)
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save conversations:', error)
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID)
  } catch {
    return null
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID, id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save active conversation id:', error)
  }
}

/**
 * Derive a title from the first user message's text content.
 */
export function deriveConversationTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.from === 'user')
  const text = firstUser?.versions?.[0]?.content?.trim() || ''
  if (!text) return 'New chat'
  const oneLine = text.replace(/\s+/g, ' ')
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine
}
