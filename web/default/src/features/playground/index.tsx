import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUserModels, getUserGroups } from './api'
import { ConversationSidebar } from './components/conversation-sidebar'
import { PlaygroundChat } from './components/playground-chat'
import { PlaygroundInput } from './components/playground-input'
import { DEFAULT_GROUP } from './constants'
import { usePlaygroundState, useChatHandler, useImageHandler } from './hooks'
import { createUserMessage, createLoadingAssistantMessage } from './lib'
import type { Message as MessageType } from './types'

export function Playground() {
  const {
    config,
    parameterEnabled,
    messages,
    models,
    groups,
    conversations,
    activeConversationId,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    newConversation,
    switchConversation,
    deleteConversation,
  } = usePlaygroundState()

  const { sendChat, stopGeneration: stopChat, isGenerating: isChatGenerating } =
    useChatHandler({
      config,
      parameterEnabled,
      onMessageUpdate: updateMessages,
    })

  const {
    sendImage,
    stopGeneration: stopImage,
    isGenerating: isImageGenerating,
  } = useImageHandler({
    config,
    onMessageUpdate: updateMessages,
  })

  const isImageMode = config.mode === 'image'
  const isGenerating = isImageMode ? isImageGenerating : isChatGenerating
  const stopGeneration = isImageMode ? stopImage : stopChat

  // Edit dialog state
  const [editingMessageKey, setEditingMessageKey] = useState<string | null>(
    null
  )

  // Load models
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['playground-models'],
    queryFn: getUserModels,
  })

  // Load groups
  const { data: groupsData } = useQuery({
    queryKey: ['playground-groups'],
    queryFn: getUserGroups,
  })

  // Update models when data changes
  useEffect(() => {
    if (!modelsData) return

    setModels(modelsData)

    // Set default model if current model is not available
    const isCurrentModelValid = modelsData.some((m) => m.value === config.model)
    if (modelsData.length > 0 && !isCurrentModelValid) {
      updateConfig('model', modelsData[0].value)
    }
  }, [modelsData, config.model, setModels, updateConfig])

  // Update groups when data changes
  useEffect(() => {
    if (!groupsData) return

    // Add auto group if not present
    const hasAutoGroup = groupsData.some((g) => g.value === DEFAULT_GROUP)
    const processedGroups = hasAutoGroup
      ? groupsData
      : [
          {
            value: DEFAULT_GROUP,
            label: 'Auto',
            ratio: 1,
            desc: 'Circuit Breaker',
          },
          ...groupsData,
        ]

    setGroups(processedGroups)
  }, [groupsData, setGroups])

  const handleSendMessage = (text: string) => {
    const userMessage = createUserMessage(text)
    const assistantMessage = createLoadingAssistantMessage()

    const newMessages = [...messages, userMessage, assistantMessage]
    updateMessages(newMessages)

    if (isImageMode) {
      sendImage(text)
    } else {
      sendChat(newMessages)
    }
  }

  const handleCopyMessage = (message: MessageType) => {
    // Copy is handled in MessageActions component
    // eslint-disable-next-line no-console
    console.log('Message copied:', message.key)
  }

  const handleRegenerateMessage = (message: MessageType) => {
    // Find the message index and regenerate from there
    const messageIndex = messages.findIndex((m) => m.key === message.key)
    if (messageIndex === -1) return

    // Remove messages after this one and regenerate
    const messagesUpToHere = messages.slice(0, messageIndex)
    const loadingMessage = createLoadingAssistantMessage()
    const newMessages = [...messagesUpToHere, loadingMessage]

    updateMessages(newMessages)
    if (isImageMode) {
      const lastUser = [...messagesUpToHere]
        .reverse()
        .find((m) => m.from === 'user')
      const prompt = lastUser?.versions?.[0]?.content || ''
      if (prompt) sendImage(prompt)
    } else {
      sendChat(newMessages)
    }
  }

  const handleEditMessage = useCallback((message: MessageType) => {
    setEditingMessageKey(message.key)
  }, [])

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditingMessageKey(null)
  }, [])

  // Apply edit and optionally re-submit from the edited user message
  const applyEdit = useCallback(
    (newContent: string, submit: boolean) => {
      if (!editingMessageKey) return
      const index = messages.findIndex((m) => m.key === editingMessageKey)
      if (index === -1) return

      const updated = messages.map((m) =>
        m.key === editingMessageKey
          ? { ...m, versions: [{ ...m.versions[0], content: newContent }] }
          : m
      )

      setEditingMessageKey(null)

      if (!submit || updated[index].from !== 'user') {
        updateMessages(updated)
        return
      }

      const toSubmit = [
        ...updated.slice(0, index + 1),
        createLoadingAssistantMessage(),
      ]
      updateMessages(toSubmit)
      if (isImageMode) {
        sendImage(newContent)
      } else {
        sendChat(toSubmit)
      }
    },
    [editingMessageKey, messages, updateMessages, sendChat, sendImage, isImageMode]
  )

  const handleDeleteMessage = (message: MessageType) => {
    const newMessages = messages.filter((m) => m.key !== message.key)
    updateMessages(newMessages)
  }

  return (
    <div className='flex size-full overflow-hidden'>
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={switchConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        disabled={isGenerating}
      />
      <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <PlaygroundChat
            messages={messages}
            onCopyMessage={handleCopyMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            isGenerating={isGenerating}
            editingKey={editingMessageKey}
            onCancelEdit={handleEditOpenChange}
            onSaveEdit={(newContent) => applyEdit(newContent, false)}
            onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
          />
        </div>

        <div className='mx-auto w-full max-w-4xl'>
          <PlaygroundInput
            disabled={isGenerating}
            groups={groups}
            groupValue={config.group}
            isGenerating={isGenerating}
            isModelLoading={isLoadingModels}
            modelValue={config.model}
            models={models}
            onGroupChange={(value) => updateConfig('group', value)}
            onModelChange={(value) => updateConfig('model', value)}
            onStop={stopGeneration}
            onSubmit={handleSendMessage}
            mode={config.mode}
            onModeChange={(value) => updateConfig('mode', value)}
            imageSize={config.imageSize}
            onImageSizeChange={(value) => updateConfig('imageSize', value)}
            imageN={config.imageN}
            onImageNChange={(value) => updateConfig('imageN', value)}
            imageQuality={config.imageQuality}
            onImageQualityChange={(value) =>
              updateConfig('imageQuality', value)
            }
          />
        </div>
      </div>
    </div>
  )
}
