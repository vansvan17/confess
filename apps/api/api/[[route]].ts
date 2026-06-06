import { handle } from "hono/vercel";
import { app } from "../src/app";

export const config = { runtime: "nodejs" as const };

export default handle(app);
