import type { ChatMessageEvent } from '@stream/chat'
import type { EventBus } from '@stream/events'
import { hasPermission } from './permissions'
import { renderTemplate } from './template'
import type { ChatSender, CommandBotOptions, CommandContext, CommandDefinition } from './types'

/**
 * 채팅 명령어·자동응답 프레임워크.
 * 수신은 EventBus/ChatEvent, 송신은 선택적 ChatSender(플랫폼별 점진 추가).
 */
export class CommandBot {
  readonly channelId: string
  readonly prefix: string
  private readonly commands = new Map<string, CommandDefinition>()
  private readonly sender?: ChatSender
  private readonly varProviders: Record<string, string | (() => string)>
  private readonly now: () => number
  private readonly userCooldown = new Map<string, number>()
  private readonly globalCooldown = new Map<string, number>()
  private detach: (() => void) | undefined

  constructor(options: CommandBotOptions) {
    this.channelId = options.channelId
    this.prefix = options.prefix ?? '!'
    this.sender = options.sender
    this.varProviders = { ...(options.vars ?? {}) }
    this.now = options.now ?? Date.now
    for (const command of options.commands ?? []) {
      this.register(command)
    }
  }

  register(command: CommandDefinition): void {
    const names = [command.name, ...(command.aliases ?? [])]
    for (const name of names) {
      this.commands.set(name.toLowerCase(), command)
    }
  }

  setVar(key: string, value: string | (() => string)): void {
    this.varProviders[key] = value
  }

  attachEventBus(bus: EventBus): () => void {
    this.detach?.()
    this.detach = bus.subscribe(
      (event) => {
        if (event.type === 'message') void this.handleMessage(event)
      },
      { types: ['message'] },
    )
    return () => {
      this.detach?.()
      this.detach = undefined
    }
  }

  async handleMessage(event: ChatMessageEvent): Promise<boolean> {
    const text = event.text.trim()
    if (!text.startsWith(this.prefix)) return false

    const body = text.slice(this.prefix.length).trim()
    if (!body) return false

    const [rawName, ...args] = body.split(/\s+/)
    const name = (rawName ?? '').toLowerCase()
    const command = this.commands.get(name)
    if (!command) return false

    if (!hasPermission(event.user.role, command.permission)) return false

    const now = this.now()
    if (command.globalCooldownMs) {
      const prev = this.globalCooldown.get(command.name)
      if (prev != null && now - prev < command.globalCooldownMs) return false
    }
    if (command.cooldownMs) {
      const key = `${command.name}:${event.user.id}`
      const prev = this.userCooldown.get(key)
      if (prev != null && now - prev < command.cooldownMs) return false
    }

    const vars = this.resolveVars({
      user: event.user.nickname,
      platform: event.platform,
      channelId: this.channelId,
      command: command.name,
      args: args.join(' '),
    })

    const reply = async (replyText: string) => {
      const rendered = renderTemplate(replyText, vars)
      await this.sender?.send(event.platform, this.channelId, rendered)
    }

    const ctx: CommandContext = {
      platform: event.platform,
      channelId: this.channelId,
      user: event.user,
      message: event,
      command: command.name,
      args,
      argText: args.join(' '),
      reply,
      vars,
    }

    if (command.handler) {
      await command.handler(ctx)
    } else if (command.response) {
      await reply(command.response)
    }

    if (command.cooldownMs) {
      this.userCooldown.set(`${command.name}:${event.user.id}`, now)
    }
    if (command.globalCooldownMs) {
      this.globalCooldown.set(command.name, now)
    }

    return true
  }

  dispose(): void {
    this.detach?.()
    this.detach = undefined
  }

  private resolveVars(extra: Record<string, string>): Record<string, string> {
    const vars: Record<string, string> = { ...extra }
    for (const [key, value] of Object.entries(this.varProviders)) {
      vars[key] = typeof value === 'function' ? value() : value
    }
    return vars
  }
}

export function createCommandBot(options: CommandBotOptions): CommandBot {
  return new CommandBot(options)
}

/** 자주 쓰는 기본 명령 세트. */
export function builtinCommands(options: {
  discord?: string
  uptime?: () => string
}): CommandDefinition[] {
  const commands: CommandDefinition[] = []
  if (options.discord) {
    commands.push({
      name: 'discord',
      aliases: ['디코'],
      response: options.discord,
      cooldownMs: 5000,
    })
  }
  if (options.uptime) {
    commands.push({
      name: 'uptime',
      aliases: ['업타임'],
      cooldownMs: 5000,
      handler: async (ctx) => {
        await ctx.reply(options.uptime?.() ?? '오프라인')
      },
    })
  }
  return commands
}
