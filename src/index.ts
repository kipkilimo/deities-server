import dotenv from "dotenv";
import express from "express";
import cors from "cors"; // Import the cors package

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "@apollo/server-plugin-landing-page-graphql-playground";
import { expressMiddleware } from "@apollo/server/express4";
import { json } from "body-parser";
import userTypeDefs from "./graphql/userSchema";
import paperTypeDefs from "./graphql/paperSchema"; // resourceTypeDefs
import resourceTypeDefs from "./graphql/resourceSchema"; //

import fileRoutes from "../src/routes/fileRoutes"; // Adjust the path as necessary
import resourceUploaders from "../src/routes/resourceUploaders"; // Adjust the path as necessary

import userResolver from "../src/resolvers/userResolvers";
import paperResolver from "../src/resolvers/paperResolvers";
import resourceResolver from "../src/resolvers/resourceResolvers";
import { handlePdfConversion } from "../src/utils/pdfConverter";

import connectDB from "../src/database/connection";
import auth from "../src/middleware/auth";

dotenv.config();

const startServer = async () => {
  const app = express();
  // Middleware to extract client's IP address
  // Configure CORS POSTER MODEL POLL TEST
  app.use(
    cors({
      origin: "*", // Allow all origins (change this to specific origins in production)
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(auth);

  const server = new ApolloServer({
    typeDefs: [userTypeDefs, paperTypeDefs, resourceTypeDefs],
    resolvers: [userResolver, paperResolver, resourceResolver],
    csrfPrevention: true,
    introspection: true,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
  });

  await server.start();

  app.use("/graphql", json(), expressMiddleware(server));

  connectDB();
  // Use the file routes
  app.use("/api", fileRoutes); // All routes in fileRoutes will be prefixed with /api
  app.use("/resources", resourceUploaders);
  // app.post("/convert-pdf", handlePdfConversion);

  app.listen({ port: process.env.PORT }, () =>
    console.log(`Server ready at http://localhost:${process.env.PORT}/graphql`)
  );
};

startServer();
