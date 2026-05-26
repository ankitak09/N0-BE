import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
