import { logger } from "@/utils/logger.js"

type Listener<Arguments extends unknown[]> = (...payload: Arguments) => void | Promise<unknown>

type Subscription<Arguments extends unknown[]> = {
  listener: Listener<Arguments>
  onError?: (error: unknown) => void | Promise<unknown>
  controller: AbortController
}

type Subscriptions<Events extends { [Event in keyof Events]: unknown[] }> = {
  [Event in keyof Events]?: Subscription<Events[Event]>[]
}

export class PubSub<Events extends { [Event in keyof Events]: unknown[] }> {
  private readonly subscriptions: Subscriptions<Events> = {}

  constructor() {
    // Host event names must never resolve inherited object properties.
    Object.setPrototypeOf(this.subscriptions, null)
  }

  publish<Event extends keyof Events>(event: Event, ...payload: Events[Event]): void {
    const subscriptions = this.subscriptions[event]
    if (subscriptions === undefined) return

    const firstSubscription = subscriptions[0]
    if (firstSubscription === undefined) return

    if (subscriptions.length === 1) {
      this.dispatch(firstSubscription, event, payload)
      return
    }

    // Preserve the current dispatch set if listeners add/remove subscriptions.
    const dispatchQueue = subscriptions.slice()
    for (const subscription of dispatchQueue) {
      this.dispatch(subscription, event, payload)
    }
  }

  subscribe<Event extends keyof Events>(
    event: Event,
    listener: Listener<Events[Event]>,
    onError?: (error: unknown) => void | Promise<unknown>
  ): AbortSignal {
    const controller = new AbortController()
    const subscriptions = this.findOrCreateSubscriptions(event)
    subscriptions.push({
      listener,
      onError,
      controller,
    })

    return controller.signal
  }

  unsubscribe<Event extends keyof Events>(event: Event, listener: Listener<Events[Event]>): void {
    const subscriptions = this.subscriptions[event]
    if (subscriptions === undefined) {
      return
    }

    for (let index = subscriptions.length - 1; index >= 0; index -= 1) {
      const subscription = subscriptions[index]
      if (
        subscription !== undefined &&
        !subscription.controller.signal.aborted &&
        subscription.listener === listener
      ) {
        subscriptions.splice(index, 1)
        if (subscriptions.length === 0) {
          delete this.subscriptions[event]
        }
        subscription.controller.abort()
        return
      }
    }
  }

  private findOrCreateSubscriptions<Event extends keyof Events>(
    event: Event
  ): Subscription<Events[Event]>[] {
    const subscriptions = this.subscriptions[event]
    if (subscriptions !== undefined) {
      return subscriptions
    }

    const newSubscriptions: Subscription<Events[Event]>[] = []
    this.subscriptions[event] = newSubscriptions
    return newSubscriptions
  }

  private dispatch<Arguments extends unknown[]>(
    subscription: Subscription<Arguments>,
    event: keyof Events,
    payload: Arguments
  ): void {
    if (subscription.controller.signal.aborted) {
      return
    }

    let result: void | Promise<unknown>
    try {
      result = subscription.listener(...payload)
    } catch (error) {
      this.handleFailure(subscription, event, error)
      return
    }

    if (result !== undefined) {
      void Promise.resolve(result).catch((error: unknown) => {
        this.handleFailure(subscription, event, error)
      })
    }
  }

  private handleFailure<Arguments extends unknown[]>(
    subscription: Subscription<Arguments>,
    event: keyof Events,
    error: unknown
  ): void {
    logger.error("PubSub listener failed", { event: String(event), error })

    const { controller, onError } = subscription
    if (controller.signal.aborted || onError === undefined) {
      return
    }

    let recovery: void | Promise<unknown>
    try {
      recovery = onError(error)
    } catch (recoveryError) {
      this.logRecoveryFailure(event, recoveryError)
      return
    }

    if (recovery !== undefined) {
      void Promise.resolve(recovery).catch((recoveryError: unknown) => {
        this.logRecoveryFailure(event, recoveryError)
      })
    }
  }

  private logRecoveryFailure(event: keyof Events, error: unknown): void {
    logger.error("PubSub error handler failed", { event: String(event), error })
  }
}
