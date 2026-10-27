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

interface ProjectRow {
  id: number
  active: boolean
  category: "A" | "B"
}

type ProjectWhere = WhereOptions<ProjectRow, "id" | "active" | "category">
type ProjectFilters = FiltersOptions<{ assignedToMe: boolean }>
type ProjectQuery = QueryOptions<ProjectWhere, ProjectFilters>
type ProjectPolicy = Policy & { export: boolean }

type ElccPackets = {
  "program.status-changed": { programId: number; status: "active" | "suspended" }
  "inspection.scheduled": { inspectionId: number; siteName: string; scheduledAt: string }
}
type ElccPacket = ChannelPacket<ElccPackets>
type ElccServerEvents = ChannelServerEvents<ElccPackets>

const order: ModelOrder[] = [
  ["category", "asc"],
  ["id", "desc"],
]
const query: ProjectQuery = {
  where: { active: true },
  filters: { assignedToMe: true },
  order,
  perPage: MAX_PER_PAGE,
}
const policy: ProjectPolicy = {
  show: true,
  create: false,
  update: false,
  destroy: false,
  export: true,
}

const programPacket: ElccPacket = {
  type: "program.status-changed",
  payload: { programId: 605, status: "active" },
}
const inspectionPacket: ElccPacket = {
  type: "inspection.scheduled",
  payload: { inspectionId: 804, siteName: "North Campus", scheduledAt: "2026-11-02T09:30:00Z" },
}

// @ts-expect-error Unsupported tuple arities are not part of the common wire contract.
const unsupportedOrder: ModelOrder[] = [["a", "b", "c", "d", "e", "f", "g"]]
// @ts-expect-error Where values remain tied to the selected model fields.
const unsupportedValue: ProjectWhere = { active: "yes" }
// @ts-expect-error Packet labels must come from this host catalog.
const unsupportedLabel: ElccPacket = { type: "application.created", payload: programPacket.payload }
// @ts-expect-error The selected packet label requires its matching payload shape.
const unsupportedPayload: ElccPacket = {
  type: "program.status-changed",
  payload: inspectionPacket.payload,
}

function checkElccPacketCorrelation(
  packetType: keyof ElccPackets,
  packetPayload: ElccPackets[keyof ElccPackets]
): ElccPacket {
  // @ts-expect-error A union label and independent union payload are not correlated.
  return { type: packetType, payload: packetPayload }
}

export function summarizeElccPacket(packet: ElccPacket): string {
  switch (packet.type) {
    case "program.status-changed":
      return `Program ${packet.payload.programId} is ${packet.payload.status}`
    case "inspection.scheduled":
      return `Inspection ${packet.payload.inspectionId} at ${packet.payload.siteName} is scheduled for ${packet.payload.scheduledAt}`
  }
}

export function sendElccPackets(events: ElccServerEvents): void {
  events.packet(programPacket)
  events.packet(inspectionPacket)
}

void [
  query,
  policy,
  unsupportedOrder,
  unsupportedValue,
  unsupportedLabel,
  unsupportedPayload,
  checkElccPacketCorrelation,
]
