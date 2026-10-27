import {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  MAX_PER_PAGE_EQUIVALENT,
} from "express-light-rail/contracts"
import { sendElccPackets, summarizeElccPacket } from "./contracts"

export const paginationDefaults = [DEFAULT_PER_PAGE, MAX_PER_PAGE, MAX_PER_PAGE_EQUIVALENT]

export const elccPacketSummaries: string[] = []
export const programPacketSummary = summarizeElccPacket({
  type: "program.status-changed",
  payload: { programId: 605, status: "active" },
})

sendElccPackets({
  packet: (packet) => {
    elccPacketSummaries.push(summarizeElccPacket(packet))
  },
  subscribed: () => {},
  unsubscribed: () => {},
  invalidated: () => {},
})
