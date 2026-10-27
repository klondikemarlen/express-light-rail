import {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  MAX_PER_PAGE_EQUIVALENT,
} from "express-light-rail/contracts"
import { sendTravelPackets, summarizeTravelPacket } from "./contracts"

export const paginationDefaults = [DEFAULT_PER_PAGE, MAX_PER_PAGE, MAX_PER_PAGE_EQUIVALENT]

export const travelPacketSummaries: string[] = []
export const travelRequestSummary = summarizeTravelPacket({
  type: "travel.requested",
  payload: { requestId: "request-204", travelerId: "traveler-17", destination: "Kyoto" },
})

sendTravelPackets({
  packet: (packet) => {
    travelPacketSummaries.push(summarizeTravelPacket(packet))
  },
  subscribed: () => {},
  unsubscribed: () => {},
  invalidated: () => {},
})
