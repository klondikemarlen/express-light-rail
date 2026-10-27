import {
  MAX_PER_PAGE,
  type ChannelPacket,
  type ChannelServerEvents,
  type FiltersOptions,
  type ModelOrder,
  type Policy,
  type QueryOptions,
  type WhereOptions,
} from "express-light-rail/contracts"

interface TravelRecord {
  id: number
  status: "draft" | "approved"
  confidential: boolean
}

type TravelWhere = WhereOptions<TravelRecord, "id" | "status">
type TravelFilters = FiltersOptions<{ includeArchived: boolean }>
type TravelQuery = QueryOptions<TravelWhere, TravelFilters>
type TravelPolicy = Policy & { approve: boolean }

type TravelPackets = {
  "travel.requested": { requestId: string; travelerId: string; destination: string }
  "travel.notification": { notificationId: string; recipientId: string; message: string }
}
type TravelPacket = ChannelPacket<TravelPackets>
type TravelServerEvents = ChannelServerEvents<TravelPackets>

const order: ModelOrder[] = [
  ["status", "asc"],
  ["id", "desc"],
]
const where: TravelWhere = { id: [1, 2], status: "draft" }
const query: TravelQuery = {
  where,
  filters: { includeArchived: false },
  order,
  page: 1,
  perPage: MAX_PER_PAGE,
}
const policy: TravelPolicy = {
  show: true,
  create: false,
  update: true,
  destroy: false,
  approve: true,
}

const requestPacket: TravelPacket = {
  type: "travel.requested",
  payload: { requestId: "request-204", travelerId: "traveler-17", destination: "Kyoto" },
}
const notificationPacket: TravelPacket = {
  type: "travel.notification",
  payload: {
    notificationId: "notification-18",
    recipientId: "traveler-17",
    message: "Your request is approved.",
  },
}

// @ts-expect-error Query where keys must exist on the host model.
const unsupportedField: TravelWhere = { missing: "value" }
const unsupportedPolicy: Policy = {
  show: true,
  create: true,
  update: true,
  destroy: false,
  // @ts-expect-error Shared policy has only the four common action keys.
  approve: true,
}
// @ts-expect-error Packet labels must come from this host catalog.
const unsupportedLabel: TravelPacket = { type: "travel.departed", payload: requestPacket.payload }
// @ts-expect-error The selected packet label requires its matching payload shape.
const unsupportedPayload: TravelPacket = {
  type: "travel.requested",
  payload: notificationPacket.payload,
}

function checkTravelPacketCorrelation(
  packetType: keyof TravelPackets,
  packetPayload: TravelPackets[keyof TravelPackets]
): TravelPacket {
  // @ts-expect-error A union label and independent union payload are not correlated.
  return { type: packetType, payload: packetPayload }
}

export function summarizeTravelPacket(packet: TravelPacket): string {
  switch (packet.type) {
    case "travel.requested":
      return `${packet.payload.travelerId} requested travel to ${packet.payload.destination}`
    case "travel.notification":
      return `${packet.payload.recipientId}: ${packet.payload.message}`
  }
}

export function sendTravelPackets(events: TravelServerEvents): void {
  events.packet(requestPacket)
  events.packet(notificationPacket)
}

void [
  query,
  policy,
  unsupportedField,
  unsupportedPolicy,
  unsupportedLabel,
  unsupportedPayload,
  checkTravelPacketCorrelation,
]
