import { ensureDatabaseDirectory, sequelize } from "@example-app/database.js"

import { Comment } from "@example-app/models/comment.js"
import { Thread } from "@example-app/models/thread.js"
import { User } from "@example-app/models/user.js"

User.hasMany(Thread, {
  as: "threads",

  foreignKey: {
    name: "authorId",
    onDelete: "RESTRICT",
  },
})

User.hasMany(Comment, {
  as: "comments",

  foreignKey: {
    name: "authorId",
    onDelete: "RESTRICT",
  },
})

Thread.belongsTo(User, {
  as: "author",

  foreignKey: {
    name: "authorId",
    onDelete: "RESTRICT",
  },
})

Thread.hasMany(Comment, {
  as: "comments",

  foreignKey: {
    name: "threadId",
    onDelete: "CASCADE",
  },
})

Comment.belongsTo(User, {
  as: "author",

  foreignKey: {
    name: "authorId",
    onDelete: "RESTRICT",
  },
})

Comment.belongsTo(Thread, {
  as: "thread",

  foreignKey: {
    name: "threadId",
    onDelete: "CASCADE",
  },
})

export { Comment, Thread, User }

export async function initializeDatabase(): Promise<void> {
  await ensureDatabaseDirectory()
  await sequelize.sync()
}
