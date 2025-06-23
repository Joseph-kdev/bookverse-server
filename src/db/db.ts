import { drizzle } from "drizzle-orm/singlestore/driver"
import postgres from "postgres"

const connectionUrl = process.env.DATABASE_URL

if(!connectionUrl) {
    throw new Error("No database Url found")
}

const client = postgres(connectionUrl)
export const db = drizzle(client)