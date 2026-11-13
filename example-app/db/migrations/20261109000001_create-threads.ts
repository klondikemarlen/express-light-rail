import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("threads", (table) => {
    table.increments("id").primary()
    table.string("title", 255).notNullable()
    table.text("body").notNullable()
    table.integer("author_id").notNullable()
    table.timestamp("created_at").notNullable().defaultTo(database.fn.now())
    table.timestamp("updated_at").notNullable().defaultTo(database.fn.now())
    table.timestamp("deleted_at").nullable()

    table.foreign("author_id").references("users.id")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("threads")
}
