import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http"; // Import http module to create HTTP server
import { initializeWebSocket } from "./pollSocket";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "@apollo/server-plugin-landing-page-graphql-playground";
import { expressMiddleware } from "@apollo/server/express4";
import { json } from "body-parser";
import userTypeDefs from "./graphql/userSchema";
import paperTypeDefs from "./graphql/paperSchema";
import resourceTypeDefs from "./graphql/resourceSchema";
import vendorTypeDefs from "./graphql/vendorSchema";
import voucherRoutes from "../src/routes/voucherRoutes";
import fileRoutes from "../src/routes/fileRoutes";
import resourceUploaders from "../src/routes/resourceUploaders";
import { s3Deleter } from "../src/utils/awsDeleter";
import userResolver from "../src/resolvers/userResolvers";
import paperResolver from "../src/resolvers/paperResolvers";
import resourceResolver from "../src/resolvers/resourceResolvers";
import vendorResolver from "../src/resolvers/vendorResolver";
import { handlePdfConversion } from "../src/utils/pdfConverter";
import connectDB from "../src/database/connection";
import auth from "../src/middleware/auth";

const startServer = async () => {
  const app = express();

  // Configure CORS with specific origins in production
  app.use(
    cors({
      origin: "*", // Replace with your allowed origins
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(auth);

  const apolloServer = new ApolloServer({
    typeDefs: [userTypeDefs, paperTypeDefs, resourceTypeDefs, vendorTypeDefs],
    resolvers: [userResolver, paperResolver, resourceResolver, vendorResolver],
    csrfPrevention: true,
    introspection: true,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
  });

  await apolloServer.start();

  // Attach Apollo Server as middleware
  app.use("/graphql", json(), expressMiddleware(apolloServer));

  connectDB();

  // Use the file routes
  app.post("/delete-files", s3Deleter);

  app.use("/api", fileRoutes);
  app.use("/vendors", voucherRoutes);
  app.use("/resources", resourceUploaders);

  // Uncomment if PDF conversion is enabled
  // app.post("/convert-pdf", handlePdfConversion);

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize the WebSocket server
  initializeWebSocket(httpServer);

  // Start the server
  httpServer.listen(process.env.PORT, () => {
    console.log(`Server ready at http://localhost:${process.env.PORT}/graphql`);
  });
};

startServer();
