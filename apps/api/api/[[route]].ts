import { handle } from "hono/vercel";
import { app } from "../src/app";

export const config = { runtime: "nodejs22.x" };

export default handle(app);
