export type ChannelPacket<Packets extends object> = {
  [Type in keyof Packets & string]: {
    type: Type
    payload: Packets[Type]
  }
}[keyof Packets & string]

export type ChannelServerEvents<Packets extends object> = {
  packet: (packet: ChannelPacket<Packets>) => void
  subscribed: () => void
  unsubscribed: () => void
  invalidated: () => void
}
