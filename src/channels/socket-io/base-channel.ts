import type { Socket } from "socket.io"

import type { ChannelPacket } from "@/contracts/channel-packet.js"

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

  broadcast(packet: ChannelPacket<Packets>): void {
    if (!this.socket.connected) return

    this.socket.emit("packet", packet)
  }

  protected readonly invalidate = (): void => {
    if (!this.socket.connected) return

    this.socket.emit("invalidated")
  }
}
