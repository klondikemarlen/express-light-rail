import type { Socket } from "socket.io"

type BroadcastArguments<Packets extends object> = {
  [Type in keyof Packets & string]: [type: Type, payload: Packets[Type]]
}[keyof Packets & string]

export class BaseChannel<User, Packets extends object> {
  constructor(
    protected readonly currentUser: User,
    protected readonly socket: Socket
  ) {}

  subscribed(): void | Promise<void> {
    if (!this.socket.connected) return

    this.socket.emit("subscribed")
  }

  unsubscribed(): void | Promise<void> {
    if (!this.socket.connected) return

    this.socket.emit("unsubscribed")
  }

  broadcast(...arguments_: BroadcastArguments<Packets>): void
  broadcast(type: keyof Packets & string, payload: Packets[keyof Packets & string]): void {
    if (!this.socket.connected) return

    this.socket.emit("packet", { type, payload })
  }

  protected readonly invalidate = (): void => {
    if (!this.socket.connected) return

    this.socket.emit("invalidated")
  }
}
