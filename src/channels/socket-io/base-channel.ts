import type { Socket } from "socket.io"

export class BaseChannel<User> {
  constructor(
    protected readonly currentUser: User,
    protected readonly socket: Socket
  ) {}

  subscribed(): void | Promise<void> {
    this.broadcast("subscribed")
  }

  unsubscribed(): void | Promise<void> {
    this.broadcast("unsubscribed")
  }

  broadcast(event: string, ...payload: unknown[]): void {
    if (!this.socket.connected) return

    this.socket.emit(event, ...payload)
  }

  protected readonly invalidate = (): void => {
    this.broadcast("invalidated")
  }
}
