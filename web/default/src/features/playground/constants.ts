import type { PlaygroundConfig, ParameterEnabled } from './types'

// Message constants
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const

export const MESSAGE_STATUS = {
  LOADING: 'loading',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const

// API endpoints
export const API_ENDPOINTS = {
  CHAT_COMPLETIONS: '/pg/chat/completions',
  IMAGES_GENERATIONS: '/pg/images/generations',
  USER_MODELS: '/api/user/models',
  USER_GROUPS: '/api/user/self/groups',
} as const

// Image generation defaults
export const IMAGE_SIZE_OPTIONS = [
  '256x256',
  '512x512',
  '1024x1024',
  '1024x1792',
  '1792x1024',
] as const

export const IMAGE_QUALITY_OPTIONS = [
  'standard',
  'hd',
  'low',
  'medium',
  'high',
  'auto',
] as const

// Heuristic — model names that suggest image generation support.
// Matches gpt-image*, dall-e*, imagen*, flux*, stable-diffusion*, sd*, etc.
export const IMAGE_MODEL_PATTERNS: RegExp[] = [
  /gpt-image/i,
  /dall[\s-]?e/i,
  /imagen/i,
  /flux/i,
  /stable[\s-]?diffusion/i,
  /\bsd[-_]/i,
  /seedream/i,
  /kolors/i,
  /ideogram/i,
  /recraft/i,
  /grok-2-image/i,
  /qwen[-_]?image/i,
]

export function isImageModel(model: string): boolean {
  if (!model) return false
  return IMAGE_MODEL_PATTERNS.some((re) => re.test(model))
}

// Default group
export const DEFAULT_GROUP = 'auto' as const

// Default configuration
export const DEFAULT_CONFIG: PlaygroundConfig = {
  model: 'gpt-4o',
  group: DEFAULT_GROUP,
  temperature: 0.7,
  top_p: 1,
  max_tokens: 4096,
  frequency_penalty: 0,
  presence_penalty: 0,
  seed: null,
  stream: true,
  mode: 'chat',
  imageSize: '1024x1024',
  imageN: 1,
  imageQuality: 'standard',
}

export const DEFAULT_PARAMETER_ENABLED: ParameterEnabled = {
  temperature: true,
  top_p: true,
  max_tokens: false,
  frequency_penalty: true,
  presence_penalty: true,
  seed: false,
}

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'playground_config',
  MESSAGES: 'playground_messages',
  PARAMETER_ENABLED: 'playground_parameter_enabled',
  CONVERSATIONS: 'playground_conversations',
  ACTIVE_CONVERSATION_ID: 'playground_active_conversation_id',
} as const

export const MAX_CONVERSATION_TITLE_LENGTH = 40 as const

// Error messages
export const ERROR_MESSAGES = {
  API_REQUEST_ERROR: 'Request error occurred',
  NETWORK_ERROR: 'Network connection failed or server not responding',
  PARSE_ERROR: 'Error parsing response data',
  STREAM_START_ERROR: 'Error establishing connection',
  CONNECTION_CLOSED: 'Connection closed',
  INTERRUPTED: 'Generation was interrupted',
} as const

// Message action button styles
export const MESSAGE_ACTION_BUTTON_STYLES = {
  BASE: 'size-7 text-muted-foreground hover:text-foreground',
  DELETE: 'size-7 text-muted-foreground hover:text-destructive',
  ICON: 'size-4',
} as const

// Message action labels
export const MESSAGE_ACTION_LABELS = {
  COPY: 'Copy',
  COPIED: 'Copied!',
  REGENERATE: 'Regenerate',
  EDIT: 'Edit',
  DELETE: 'Delete',
  NO_CONTENT: 'No content to copy',
  WAIT_GENERATION: 'Please wait for the current generation to complete',
} as const
