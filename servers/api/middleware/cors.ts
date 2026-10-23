import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../constants/index.js";

type CorsDependencies = Readonly<{
  origin: string;
  environment?: string;
}>;

export const createCorsMiddleware = ({ origin, environment }: CorsDependencies): RequestHandler =>
  (request, response, next) => {
    const requestOrigin = request.headers.origin;
    const allowedOrigin = (environment === "development" && requestOrigin && (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("http://127.0.0.1:")))
      ? requestOrigin
      : origin;

    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (request.method === "OPTIONS") {
      response.sendStatus(HTTP_STATUS.noContent);
      return;
    }
    next();
  };
