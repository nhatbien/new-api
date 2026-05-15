import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../constants'
import {
  loadConfig,
  saveConfig,
  loadParameterEnabled,
  saveParameterEnabled,
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  deriveConversationTitle,
} from '../lib'
import type {
  Message,
  PlaygroundConfig,
  ParameterEnabled,
  ModelOption,
  GroupOption,
  Conversation,
} from '../types'

function createEmptyConversation(): Conversation {
  const now = Date.now()
  return {
    id: `conv-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Main state management hook for playground
 */
export function usePlaygroundState() {
  const [config, setConfig] = useState<PlaygroundConfig>(() => {
    const savedConfig = loadConfig()
    return { ...DEFAULT_CONFIG, ...savedConfig }
  })

  const [parameterEnabled, setParameterEnabled] = useState<ParameterEnabled>(
    () => {
      const saved = loadParameterEnabled()
      return { ...DEFAULT_PARAMETER_ENABLED, ...saved }
    }
  )

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const existing = loadConversations()
    if (existing.length > 0) return existing
    const fresh = createEmptyConversation()
    saveConversations([fresh])
    saveActiveConversationId(fresh.id)
    return [fresh]
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const saved = loadActiveConversationId()
    const loaded = loadConversations()
    if (saved && loaded.some((c) => c.id === saved)) return saved
    return loaded[0]?.id ?? ''
  })

  const [models, setModels] = useState<ModelOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId]
  )

  const messages = activeConversation?.messages ?? []

  const persistConversations = useCallback((next: Conversation[]) => {
    saveConversations(next)
    return next
  }, [])

  const updateConfig = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((prev) => {
        const updated = { ...prev, [key]: value }
        saveConfig(updated)
        return updated
      })
    },
    []
  )

  const updateParameterEnabled = useCallback(
    (key: keyof ParameterEnabled, value: boolean) => {
      setParameterEnabled((prev) => {
        const updated = { ...prev, [key]: value }
        saveParameterEnabled(updated)
        return updated
      })
    },
    []
  )

  // Update messages of the active conversation
  const updateMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== activeId) return c
          const newMessages =
            typeof updater === 'function' ? updater(c.messages) : updater
          const isStillDefault =
            c.title === 'New chat' || c.title.trim() === ''
          return {
            ...c,
            messages: newMessages,
            title: isStillDefault
              ? deriveConversationTitle(newMessages)
              : c.title,
            updatedAt: Date.now(),
          }
        })
        return persistConversations(next)
      })
    },
    [activeId, persistConversations]
  )

  const newConversation = useCallback(() => {
    setConversations((prev) => {
      // If active conversation is empty, just reuse it
      const active = prev.find((c) => c.id === activeId)
      if (active && active.messages.length === 0) return prev
      const fresh = createEmptyConversation()
      const next = [fresh, ...prev]
      saveActiveConversationId(fresh.id)
      setActiveId(fresh.id)
      return persistConversations(next)
    })
  }, [activeId, persistConversations])

  const switchConversation = useCallback(
    (id: string) => {
      setActiveId(id)
      saveActiveConversationId(id)
    },
    []
  )

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id)
        if (remaining.length === 0) {
          const fresh = createEmptyConversation()
          saveActiveConversationId(fresh.id)
          setActiveId(fresh.id)
          return persistConversations([fresh])
        }
        if (id === activeId) {
          const nextActive = remaining[0].id
          saveActiveConversationId(nextActive)
          setActiveId(nextActive)
        }
        return persistConversations(remaining)
      })
    },
    [activeId, persistConversations]
  )

  // Reset config to defaults
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
    setParameterEnabled(DEFAULT_PARAMETER_ENABLED)
    saveConfig(DEFAULT_CONFIG)
    saveParameterEnabled(DEFAULT_PARAMETER_ENABLED)
  }, [])

  return {
    // State
    config,
    parameterEnabled,
    messages,
    models,
    groups,
    conversations,
    activeConversationId: activeId,

    // Setters
    setModels,
    setGroups,

    // Actions
    updateConfig,
    updateParameterEnabled,
    updateMessages,
    newConversation,
    switchConversation,
    deleteConversation,
    resetConfig,
  }
}
