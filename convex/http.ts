import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth のHTTPルートを追加
auth.addHttpRoutes(http);

export default http;
