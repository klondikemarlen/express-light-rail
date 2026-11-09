import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("users", (table) => {
    table.increments("id").primary()
    table.string("username", 255).notNullable().unique()
    table.string("name", 255).notNullable()
    table.string("password_hash", 255).nullable()
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(database.fn.now())
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(database.fn.now())
    table.timestamp("deleted_at", { useTz: true }).nullable()
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("users")
}
