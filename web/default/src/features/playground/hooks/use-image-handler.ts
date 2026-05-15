import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sendImageGeneration } from '../api'
import { MESSAGE_STATUS, ERROR_MESSAGES } from '../constants'
import {
  buildImageGenerationPayload,
  updateAssistantMessageWithError,
  updateLastAssistantMessage,
} from '../lib'
import type { Message, PlaygroundConfig } from '../types'

interface UseImageHandlerOptions {
  config: PlaygroundConfig
  onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void
}

function imagesToMarkdown(
  data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>
): string {
  if (!data || data.length === 0) return ''
  const parts: string[] = []
  data.forEach((item, idx) => {
    const src = item.url
      ? item.url
      : item.b64_json
        ? `data:image/png;base64,${item.b64_json}`
        : ''
    if (!src) return
    parts.push(`![image-${idx + 1}](${src})`)
    if (item.revised_prompt) {
      parts.push(`> ${item.revised_prompt}`)
    }
  })
  return parts.join('\n\n')
}

export function useImageHandler({
  config,
  onMessageUpdate,
}: UseImageHandlerOptions) {
  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendImage = useCallback(
    async (prompt: string) => {
      setIsGenerating(true)
      abortRef.current = new AbortController()
      try {
        const payload = buildImageGenerationPayload(prompt, config)
        const response = await sendImageGeneration(payload)
        const markdown = imagesToMarkdown(response?.data || [])

        if (!markdown) {
          onMessageUpdate((prev) =>
            updateAssistantMessageWithError(prev, 'No image returned')
          )
          return
        }

        onMessageUpdate((prev) =>
          updateLastAssistantMessage(prev, (message) => ({
            ...message,
            versions: [{ ...message.versions[0], content: markdown }],
            status: MESSAGE_STATUS.COMPLETE,
            isReasoningStreaming: false,
            isContentComplete: true,
          }))
        )
      } catch (error: unknown) {
        const err = error as {
          response?: {
            data?: { message?: string; error?: { code?: string; message?: string } }
          }
          message?: string
        }
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          ERROR_MESSAGES.API_REQUEST_ERROR
        toast.error(msg)
        onMessageUpdate((prev) =>
          updateAssistantMessageWithError(
            prev,
            msg,
            err?.response?.data?.error?.code
          )
        )
      } finally {
        setIsGenerating(false)
        abortRef.current = null
      }
    },
    [config, onMessageUpdate]
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsGenerating(false)
  }, [])

  return { sendImage, stopGeneration, isGenerating }
}
