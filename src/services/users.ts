import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { Users } from "../db/schema"

export const addUsers = async({userId, email} : {userId: string, email: string}) => {
    if(!userId || !email) {
        throw new Error("Empty user_id or email found");
    }
    const newUser = await db.insert(Users).values({userId: userId, email: email}).returning();
    return newUser
}

export const getUser = async (userId: string) => {
    if(!userId) {
        throw new Error("No user id was found")
    }
    const user = await db.select().from(Users).where(eq(Users.userId, userId))
    if(user.length === 0) { 
        throw new Error("No user was found")
    }
    return user
}