import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("comments", (table) => {
    table.increments("id").primary()
    table.text("body").notNullable()
    table.integer("authorId").notNullable()
    table.integer("threadId").notNullable()

    table.foreign("authorId").references("users.id")
    table.foreign("threadId").references("threads.id").onDelete("CASCADE")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("comments")
}
