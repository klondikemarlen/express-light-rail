import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("comments", (table) => {
    table.increments("id").primary()
    table.text("body").notNullable()
    table.integer("author_id").notNullable()
    table.integer("thread_id").notNullable()
    table.timestamp("created_at").notNullable().defaultTo(database.fn.now())
    table.timestamp("updated_at").notNullable().defaultTo(database.fn.now())
    table.timestamp("deleted_at").nullable()

    table.foreign("author_id").references("users.id")
    table.foreign("thread_id").references("threads.id").onDelete("CASCADE")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("comments")
}
