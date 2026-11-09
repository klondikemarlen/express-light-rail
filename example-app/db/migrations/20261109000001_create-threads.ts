import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("threads", (table) => {
    table.increments("id").primary()
    table.string("title", 255).notNullable()
    table.text("body").notNullable()
    table.integer("authorId").notNullable()

    table.foreign("authorId").references("users.id")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("threads")
}
