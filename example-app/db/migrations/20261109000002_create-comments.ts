import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("comments", (table) => {
    table.increments("id").primary()
    table.text("body").notNullable()
    table
      .integer("authorId")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION")
    table
      .integer("threadId")
      .notNullable()
      .references("id")
      .inTable("threads")
      .onDelete("CASCADE")
      .onUpdate("NO ACTION")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("comments")
}
