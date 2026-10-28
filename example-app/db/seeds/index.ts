import { seed as seedDiscussionBoard } from "@example-app/db/seeds/development/001-fill-discussion-board.js"

export const seedsByEnvironment = {
  development: [seedDiscussionBoard],
  test: [],
  production: [],
} as const
