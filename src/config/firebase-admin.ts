import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

let serviceAccount: admin.ServiceAccount;

if (process.env.GOOGLE_APP_CREDS) {
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_APP_CREDS);
    if (typeof serviceAccount.privateKey === "string") {
      serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, "\n");
    }
  } catch (error) {
    console.error("Failed to parse GOOGLE_APP_CREDS from environment variable:", error);
    throw new Error("Invalid GOOGLE_APP_CREDS environment variable");
  }
} else {
  try {
    const credPath = path.resolve(process.cwd(), "GOOGLE_APP_CREDS.json");
    const credFile = fs.readFileSync(credPath, "utf-8");
    serviceAccount = JSON.parse(credFile);
  } catch (error) {
    console.error("Failed to load GOOGLE_APP_CREDS.json:", error);
    throw new Error("GOOGLE_APP_CREDS.json not found or invalid. Set GOOGLE_APP_CREDS environment variable for production.");
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const auth = admin.auth()
export default admin;
