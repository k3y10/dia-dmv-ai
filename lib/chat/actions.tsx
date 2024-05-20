import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage
} from '@/components/blood-sugar'

import BloodSugar from '@/components/blood-sugar/blood-sugar'
import BloodSugarEntry from '@/components/blood-sugar/blood-sugar-entry'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/blood-sugar/events-skeleton'
import { Events } from '@/components/blood-sugar/events'
import { BloodSugarSkeleton } from '@/components/blood-sugar/blood-sugar-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/blood-sugar/message'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'

async function confirmBloodSugarEntry(level: number, time: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const logging = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Logging blood sugar level {level} mg/dL at {time}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    logging.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Logging blood sugar level {level} mg/dL at {time}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    logging.done(
      <div>
        <p className="mb-2">
          You have successfully logged blood sugar level {level} mg/dL at {time}.
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        Blood sugar level {level} mg/dL at {time} has been logged successfully.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages.slice(0, -1),
        {
          id: nanoid(),
          role: 'function',
          name: 'showBloodSugarEntry',
          content: JSON.stringify({
            level,
            time,
            status: 'completed'
          })
        },
        {
          id: nanoid(),
          role: 'system',
          content: `[User has logged blood sugar level ${level} mg/dL at ${time}.]`
        }
      ]
    })
  })

  return {
    loggingUI: logging.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    initial: <SpinnerMessage />,
    system: `\
    You are a diabetic management conversation bot and you can help users monitor and log their blood sugar levels, step by step.
    You and the user can discuss blood sugar levels and the user can log their readings, or view trends, in the UI.
    
    Messages inside [] means that it's a UI element or a user event. For example:
    - "[Blood sugar level at 9 AM = 110 mg/dL]" means that an interface of the blood sugar level at 9 AM is shown to the user.
    - "[User has logged a blood sugar level of 110 mg/dL at 9 AM]" means that the user has logged a blood sugar level of 110 mg/dL at 9 AM in the UI.
    
    If the user requests logging a blood sugar level, call \`show_blood_sugar_entry_ui\` to show the logging UI.
    If the user just wants the trend, call \`show_blood_sugar_trend\` to show the trend.
    If you want to show trending blood sugar levels, call \`list_trends\`.
    If you want to show events, call \`get_events\`.
    If the user wants to log an impossible level, respond that it is not valid.
    
    Besides that, you can also chat with users and do some calculations if needed.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      listTrends: {
        description: 'List three imaginary blood sugar trends that are notable.',
        parameters: z.object({
          trends: z.array(
            z.object({
              time: z.string().describe('The time of the trend'),
              level: z.number().describe('The blood sugar level at the time'),
              delta: z.number().describe('The change in blood sugar level')
            })
          )
        }),
        generate: async function* ({ trends }) {
          yield (
            <BotCard>
              <BloodSugarSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'listTrends',
                content: JSON.stringify(trends)
              }
            ]
          })

          return (
            <BotCard>
              <BloodSugar value={110} />
            </BotCard>
          )
        }
      },
      showBloodSugarLevel: {
        description:
          'Get the current blood sugar level of a given time. Use this to show the level to the user.',
        parameters: z.object({
          time: z
            .string()
            .describe(
              'The time of the blood sugar level reading. e.g. "9 AM"'
            ),
          level: z.number().describe('The blood sugar level.'),
          delta: z.number().describe('The change in blood sugar level')
        }),
        generate: async function* ({ time, level, delta }) {
          yield (
            <BotCard>
              <BloodSugarSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'showBloodSugarLevel',
                content: JSON.stringify({ time, level, delta })
              }
            ]
          })

          return (
            <BotCard>
              <BloodSugarEntry time="9 AM" level={110} status="completed" />
            </BotCard>
          )
        }
      },
      showBloodSugarEntry: {
        description:
          'Show the UI to log a blood sugar level reading. Use this if the user wants to log a blood sugar level reading.',
        parameters: z.object({
          time: z
            .string()
            .describe(
              'The time of the blood sugar level reading. e.g. "9 AM"'
            ),
          level: z.number().describe('The blood sugar level.'),
          status: z
            .string()
            .describe(
              'The status of the entry. Can be "requires_action" or "completed".'
            )
        }),
        generate: async function* ({ time, level, status = 'requires_action' }) {
          if (level <= 0 || level > 600) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid blood sugar level]`
                }
              ]
            })

            return <BotMessage content={'Invalid blood sugar level'} />
          }

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'showBloodSugarEntry',
                content: JSON.stringify({
                  time,
                  level,
                  status
                })
              }
            ]
          })

          return (
            <BotCard>
            <BloodSugarEntry time="9 AM" level={110} status="completed" />
            </BotCard>
          )
        }
      },
      getEvents: {
        description:
          'List significant events related to blood sugar levels between specified dates.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        generate: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'getEvents',
                content: JSON.stringify(events)
              }
            ]
          })

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmBloodSugarEntry
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state, done }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0].content.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'function' ? (
          message.name === 'listTrends' ? (
            <BotCard>
             <BloodSugarEntry time="9 AM" level={110} status="completed" />
            </BotCard>
          ) : message.name === 'showBloodSugarLevel' ? (
            <BotCard>
             <BloodSugarEntry time="9 AM" level={110} status="completed" />
            </BotCard>
          ) : message.name === 'showBloodSugarEntry' ? (
            <BotCard>
             <BloodSugarEntry time="9 AM" level={110} status="completed" />
            </BotCard>
          ) : message.name === 'getEvents' ? (
            <BotCard>
              <Events props={JSON.parse(message.content)} />
            </BotCard>
          ) : null
        ) : message.role === 'user' ? (
          <UserMessage>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
