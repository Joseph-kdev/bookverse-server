import { NextFunction, Request, RequestHandler, Response } from "express";
import { auth } from "../config/firebase-admin";

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const getAuthenticatedUser = (req: Request) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user?.uid) {
    throw new Error("Authenticated user not found");
  }

  return user;
};

export const getAuthenticatedUserId = (req: Request) => {
  return getAuthenticatedUser(req).uid;
};

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAuth = verifyToken as RequestHandler;
