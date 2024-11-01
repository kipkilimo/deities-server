import dotenv from "dotenv";
dotenv.config();
import { PubSub } from "graphql-subscriptions";
import express from "express";
import cors from "cors";

import bodyParser from "body-parser";
// import cors from "cors";

import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import { initializeWebSocket } from "./pollSocket";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "@apollo/server-plugin-landing-page-graphql-playground";
import { expressMiddleware } from "@apollo/server/express4";
import voucherRoutes from "../src/routes/voucherRoutes";
import fileRoutes from "../src/routes/fileRoutes";
import resourceUploaders from "../src/routes/resourceUploaders";
import { s3Deleter } from "../src/utils/awsDeleter";

import userTypeDefs from "./graphql/userSchema";
import paperTypeDefs from "./graphql/paperSchema";
import resourceTypeDefs from "./graphql/resourceSchema";
import paymentTypeDefs from "./graphql/paymentSchema";
import departmentTypeDefs from "./graphql/departmentSchema";
import discussionGroupTypeDefs from "./graphql/discussionGroupSchema";
import consultationTypeDefs from "./graphql/consultationSchema";
import vendorTypeDefs from "./graphql/vendorSchema";
import path from "path";

import userResolver from "../src/resolvers/userResolvers";
import paperResolver from "../src/resolvers/paperResolvers";
import consultationResolver from "../src/resolvers/consultationResolvers";
import resourceResolver from "../src/resolvers/resourceResolvers";
import vendorResolver from "../src/resolvers/vendorResolver";
import paymentResolver from "../src/resolvers/paymentResolvers";
import departmentResolver from "../src/resolvers/departmentResolvers";
import discussionGroupResolver from "../src/resolvers/discussionGroupResolvers";

import { handlePdfConversion } from "../src/utils/pdfConverter";
import connectDB from "../src/database/connection";
import auth from "../src/middleware/auth";

// Define the context interface
interface Context {
  pubsub: PubSub;
  req: express.Request;
}

const startServer = async () => {
  const app = express();
  const pubsub = new PubSub();
  // Connect to the database
  connectDB();
  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    })
  );

  app.use(express.json());
  app.use(auth);

  // Create Apollo Server with typed context
  const apolloServer = new ApolloServer<Context>({
    typeDefs: [
      userTypeDefs,
      paperTypeDefs,
      resourceTypeDefs,
      vendorTypeDefs,
      consultationTypeDefs,
      paymentTypeDefs,
      departmentTypeDefs,
      discussionGroupTypeDefs,
    ],
    resolvers: [
      userResolver,
      paperResolver,
      resourceResolver,
      vendorResolver,
      consultationResolver,
      paymentResolver,
      departmentResolver,
      discussionGroupResolver,
    ],
    csrfPrevention: true,
    introspection: true,
    // @ts-ignore
    context: async ({ req }): Promise<Context> => ({ req, pubsub }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
  });

  await apolloServer.start();

  // Use middleware with typed context
  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({ req, pubsub }),
    })
  );
  // Consolidate all CORS options into one configuration object
  const corsOptions = {
    origin: [
      "https://nem.bio", // Main origin
      "http://192.168.1.74:4000", // Specific IPs (if required)
      "http://192.168.0.105:5173",
    ],
    methods: ["GET", "PUT", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true, // Enable if cookies or sessions are used
    optionsSuccessStatus: 200, // For legacy browser support
  };

  // Apply CORS middleware with the consolidated options
  app.use(cors(corsOptions));

  // Uncomment if PDF conversion is enabled
  // app.post("/convert-pdf", handlePdfConversion);

  // Enable pre-flight requests for all routes
  app.options("*", cors(corsOptions));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );
  app.use("/graphql", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Content-Length, X-Requested-With"
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  // Route configurations
  app.post("/delete-files", s3Deleter);
  app.use("/api", fileRoutes);
  app.use("/vendors", voucherRoutes);
  app.use("/resources", resourceUploaders);

  // Load SSL certificate and key for HTTPS in production
  let httpServer;

  if (process.env.NODE_ENV === "production") {
    const privateKey = fs.readFileSync(
      "/etc/letsencrypt/live/nem.bio/privkey.pem",
      "utf8"
    );
    const certificate = fs.readFileSync(
      "/etc/letsencrypt/live/nem.bio/fullchain.pem",
      "utf8"
    );

    const credentials = { key: privateKey, cert: certificate };

    // const privateKey = fs.readFileSync(
    //   path.join(__dirname, "ssl", "privatekey.pem"),
    //   "utf8"
    // );
    // const certificate = fs.readFileSync(
    //   path.join(__dirname, "ssl", "certificate.pem"),
    //   "utf8"
    // );
    // const ca = fs.readFileSync(
    //   path.join(__dirname, "ssl", "chain.pem"),
    //   "utf8"
    // );

    // const credentials = { key: privateKey, cert: certificate, ca };

    // Create HTTPS server for production
    httpServer = createHttpsServer(credentials, app);
    console.log("HTTPS server created with SSL certificates");
  } else {
    // Create HTTP server for development
    httpServer = createServer(app);
    console.log("HTTP server created (development mode)");
  }

  // Initialize the WebSocket server
  initializeWebSocket(httpServer);

  // Start the server
  const port = process.env.PORT || 4000;
  httpServer.listen(port, () => {
    console.log(
      `Server ready at http${
        process.env.NODE_ENV === "production" ? "s" : ""
      }://localhost:${port}/graphql`
    );
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
