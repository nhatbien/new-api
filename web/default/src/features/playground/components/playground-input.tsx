import { useState } from 'react'
import {
  PaperclipIcon,
  FileIcon,
  ImageIcon,
  ScreenShareIcon,
  CameraIcon,
  GlobeIcon,
  SendIcon,
  SquareIcon,
  BarChartIcon,
  BoxIcon,
  NotepadTextIcon,
  CodeSquareIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  Settings2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { ModelGroupSelector } from '@/components/model-group-selector'
import { IMAGE_SIZE_OPTIONS, IMAGE_QUALITY_OPTIONS } from '../constants'
import type { ModelOption, GroupOption, PlaygroundMode } from '../types'

interface PlaygroundInputProps {
  onSubmit: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  groups: GroupOption[]
  groupValue: string
  onGroupChange: (value: string) => void
  mode: PlaygroundMode
  onModeChange: (mode: PlaygroundMode) => void
  imageSize: string
  onImageSizeChange: (size: string) => void
  imageN: number
  onImageNChange: (n: number) => void
  imageQuality: string
  onImageQualityChange: (quality: string) => void
}

const suggestions = [
  { icon: BarChartIcon, text: 'Analyze data', color: '#76d0eb' },
  { icon: BoxIcon, text: 'Surprise me', color: '#76d0eb' },
  { icon: NotepadTextIcon, text: 'Summarize text', color: '#ea8444' },
  { icon: CodeSquareIcon, text: 'Code', color: '#6c71ff' },
  { icon: GraduationCapIcon, text: 'Get advice', color: '#76d0eb' },
  { icon: null, text: 'More' },
]

export function PlaygroundInput({
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  models,
  modelValue,
  onModelChange,
  isModelLoading = false,
  groups,
  groupValue,
  onGroupChange,
  mode,
  onModeChange,
  imageSize,
  onImageSizeChange,
  imageN,
  onImageNChange,
  imageQuality,
  onImageQualityChange,
}: PlaygroundInputProps) {
  const isImageMode = mode === 'image'
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const isModelSelectDisabled =
    disabled || isModelLoading || models.length === 0
  const isGroupSelectDisabled = disabled || groups.length === 0

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() || disabled) return
    onSubmit(message.text)
    setText('')
  }

  const handleFileAction = (action: string) => {
    toast.info(t('Feature in development'), {
      description: action,
    })
  }

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion)
  }

  return (
    <div className='grid shrink-0 gap-4 px-1 md:pb-4'>
      <PromptInput
        groupClassName='rounded-[20px] [--radius:20px]'
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='px-5 md:text-base'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            isImageMode ? t('Describe the image you want to create') : t('Ask anything')
          }
          value={text}
        />

        <PromptInputFooter className='p-2.5'>
          <PromptInputTools>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <PromptInputButton
                    className='!rounded-full border font-medium'
                    disabled={disabled}
                    variant='outline'
                  />
                }
              >
                <PaperclipIcon size={16} />
                <span className='hidden sm:inline'>{t('Attach')}</span>
                <span className='sr-only sm:hidden'>{t('Attach')}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                <DropdownMenuItem
                  onClick={() => handleFileAction('upload-file')}
                >
                  <FileIcon className='mr-2' size={16} />
                  {t('Upload file')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFileAction('upload-photo')}
                >
                  <ImageIcon className='mr-2' size={16} />
                  {t('Upload photo')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFileAction('take-screenshot')}
                >
                  <ScreenShareIcon className='mr-2' size={16} />
                  {t('Take screenshot')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFileAction('take-photo')}
                >
                  <CameraIcon className='mr-2' size={16} />
                  {t('Take photo')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <PromptInputButton
              className='rounded-full border font-medium'
              disabled={disabled}
              onClick={() =>
                onModeChange(isImageMode ? 'chat' : 'image')
              }
              variant={isImageMode ? 'secondary' : 'outline'}
              title={isImageMode ? t('Switch to Chat') : t('Switch to Image')}
            >
              {isImageMode ? (
                <MessageSquareIcon size={16} />
              ) : (
                <ImageIcon size={16} />
              )}
              <span className='hidden sm:inline'>
                {isImageMode ? t('Chat') : t('Image')}
              </span>
            </PromptInputButton>

            {isImageMode && (
              <Popover>
                <PopoverTrigger
                  render={
                    <PromptInputButton
                      className='rounded-full border font-medium'
                      disabled={disabled}
                      variant='outline'
                    />
                  }
                >
                  <Settings2Icon size={16} />
                  <span className='hidden sm:inline'>{t('Options')}</span>
                </PopoverTrigger>
                <PopoverContent align='start' className='w-72 space-y-3'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>{t('Size')}</Label>
                    <Select value={imageSize} onValueChange={onImageSizeChange}>
                      <SelectTrigger className='h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>{t('Quality')}</Label>
                    <Select
                      value={imageQuality}
                      onValueChange={onImageQualityChange}
                    >
                      <SelectTrigger className='h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_QUALITY_OPTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>{t('Number of images')}</Label>
                    <Input
                      type='number'
                      min={1}
                      max={10}
                      value={imageN}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (!Number.isNaN(v) && v >= 1 && v <= 10) {
                          onImageNChange(v)
                        }
                      }}
                      className='h-8'
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {!isImageMode && (
              <PromptInputButton
                className='rounded-full border font-medium'
                disabled={disabled}
                onClick={() => toast.info(t('Search feature in development'))}
                variant='outline'
              >
                <GlobeIcon size={16} />
                <span className='hidden sm:inline'>{t('Search')}</span>
                <span className='sr-only sm:hidden'>{t('Search')}</span>
              </PromptInputButton>
            )}
          </PromptInputTools>

          <div className='flex items-center gap-1.5 md:gap-2'>
            <ModelGroupSelector
              selectedModel={modelValue}
              models={models}
              onModelChange={onModelChange}
              selectedGroup={groupValue}
              groups={groups}
              onGroupChange={onGroupChange}
              disabled={isModelSelectDisabled || isGroupSelectDisabled}
            />

            {isGenerating && onStop ? (
              <PromptInputButton
                className='text-foreground rounded-full font-medium'
                onClick={onStop}
                variant='secondary'
              >
                <SquareIcon className='fill-current' size={16} />
                <span className='hidden sm:inline'>{t('Stop')}</span>
                <span className='sr-only sm:hidden'>{t('Stop')}</span>
              </PromptInputButton>
            ) : (
              <PromptInputButton
                className='text-foreground rounded-full font-medium'
                disabled={disabled || !text.trim()}
                type='submit'
                variant='secondary'
              >
                <SendIcon size={16} />
                <span className='hidden sm:inline'>{t('Send')}</span>
                <span className='sr-only sm:hidden'>{t('Send')}</span>
              </PromptInputButton>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>

      {!isImageMode && (
        <Suggestions>
          {suggestions.map(({ icon: Icon, text, color }) => (
            <Suggestion
              className={`text-xs font-normal sm:text-sm ${
                text === 'More' ? 'hidden sm:flex' : ''
              }`}
              key={text}
              onClick={() => handleSuggestionClick(text)}
              suggestion={text}
            >
              {Icon && <Icon size={16} style={{ color }} />}
              {text}
            </Suggestion>
          ))}
        </Suggestions>
      )}
    </div>
  )
}
