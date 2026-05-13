import { useCallback, useRef } from 'react'
import { SSE } from 'sse.js'
import { getApiUrl, getCommonHeaders } from '@/lib/api'
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants'
import type { ChatCompletionRequest, ChatCompletionChunk } from '../types'

type SseEvent = Event & {
  data?: string
  responseCode?: number
  readyState?: number
}

/**
 * Hook for handling streaming chat completion requests
 */
export function useStreamRequest() {
  const sseSourceRef = useRef<SSE | null>(null)
  const isStreamCompleteRef = useRef(false)

  const sendStreamRequest = useCallback(
    (
      payload: ChatCompletionRequest,
      onUpdate: (type: 'reasoning' | 'content', chunk: string) => void,
      onComplete: () => void,
      onError: (error: string, errorCode?: string) => void
    ) => {
      const source = new SSE(getApiUrl(API_ENDPOINTS.CHAT_COMPLETIONS), {
        headers: getCommonHeaders(),
        method: 'POST',
        payload: JSON.stringify(payload),
        start: false,
      })

      sseSourceRef.current = source
      isStreamCompleteRef.current = false

      const closeSource = () => {
        source.close()
        sseSourceRef.current = null
      }

      const handleError = (errorMessage: string, errorCode?: string) => {
        if (!isStreamCompleteRef.current) {
          onError(errorMessage, errorCode)
          closeSource()
        }
      }

      const getErrorMessage = (e: SseEvent) => {
        let errorMessage = e.data || ERROR_MESSAGES.API_REQUEST_ERROR
        let errorCode: string | undefined

        if (e.data) {
          try {
            const parsed = JSON.parse(e.data) as {
              error?: { message?: string; code?: string }
              message?: string
            }
            errorMessage =
              parsed?.error?.message || parsed?.message || errorMessage
            errorCode = parsed?.error?.code || undefined
          } catch {
            // not JSON, use raw string
          }
        } else if (e.responseCode) {
          errorMessage = `HTTP ${e.responseCode}: ${ERROR_MESSAGES.CONNECTION_CLOSED}`
        } else {
          errorMessage = ERROR_MESSAGES.NETWORK_ERROR
        }

        return { errorMessage, errorCode }
      }

      source.addEventListener('message', (e: MessageEvent) => {
        if (e.data === '[DONE]') {
          isStreamCompleteRef.current = true
          closeSource()
          onComplete()
          return
        }

        try {
          const chunk: ChatCompletionChunk = JSON.parse(e.data)
          const delta = chunk.choices?.[0]?.delta

          if (delta) {
            if (delta.reasoning_content) {
              onUpdate('reasoning', delta.reasoning_content)
            }
            if (delta.content) {
              onUpdate('content', delta.content)
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to parse SSE message:', error)
          handleError(ERROR_MESSAGES.PARSE_ERROR)
        }
      })

      source.addEventListener('error', (e: SseEvent) => {
        // Only handle errors if stream didn't complete normally
        if (source.readyState !== 2) {
          // eslint-disable-next-line no-console
          console.warn('SSE Error:', {
            data: e.data,
            responseCode: e.responseCode,
          })
          const { errorMessage, errorCode } = getErrorMessage(e)
          handleError(errorMessage, errorCode)
        }
      })

      source.addEventListener('readystatechange', (e: SseEvent) => {
        if (e.readyState === 2 && !isStreamCompleteRef.current) {
          sseSourceRef.current = null
        }
      })

      try {
        source.stream()
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('Failed to start SSE stream:', error)
        onError(ERROR_MESSAGES.STREAM_START_ERROR)
        sseSourceRef.current = null
      }
    },
    []
  )

  const stopStream = useCallback(() => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close()
      sseSourceRef.current = null
    }
  }, [])

  // eslint-disable-next-line react-hooks/refs
  const isStreaming = sseSourceRef.current !== null

  return {
    sendStreamRequest,
    stopStream,
    // eslint-disable-next-line react-hooks/refs
    isStreaming,
  }
}
