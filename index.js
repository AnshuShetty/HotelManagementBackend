// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import http from "http";

import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers/index.js";
import { connectDB } from "./db.js";
import { verifyToken } from "./auth.js";
import { config as appConfig } from "./config.js";

async function start() {
  await connectDB(appConfig.MONGO_URI);

  const app = express();
  const httpServer = http.createServer(app);

  app.use(
    cors({
      origin: appConfig.CORS_ORIGIN,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(cookieParser());
  app.use(bodyParser.json());

  //  Apollo Server v4 initialization
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      process.env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageProductionDefault({
            footer: false,
          })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    ],
  });

  await server.start();

  // ✅ Attach Apollo middleware using @as-integrations/express
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;
        const payload = token ? verifyToken(token, appConfig.JWT_SECRET) : null;
        const user = payload ? { id: payload.id, role: payload.role } : null;
        return { user, config: appConfig };
      },
    })
  );

  // Optional: a simple home route
  app.get("/graphql/home", (_, res) =>
    res.send("🏨 Hotel Booking GraphQL API is running successfully!")
  );

  // ✅ Start the Express server
  await new Promise((resolve) =>
    httpServer.listen({ port: appConfig.PORT, host: "0.0.0.0" }, resolve)
  );

  console.log(`✅ Server running at http://0.0.0.0:${appConfig.PORT}/graphql`);
}

// start server
start().catch((e) => {
  console.error("❌ Server startup error:", e);
  process.exit(1);
});
