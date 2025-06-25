import { configDotenv } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

configDotenv()

const connectionUrl = process.env.DATABASE_URL

if(!connectionUrl) {
    throw new Error("No database Url found")
}

const client = postgres(connectionUrl)
export const db = drizzle(client)