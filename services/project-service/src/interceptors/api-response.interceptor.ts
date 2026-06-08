import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { apiSuccess, isApiEnvelope } from "../common/api-response";
import { RequestWithId } from "../middleware/request-id.middleware";

function isGenerationStreamRequest(request: RequestWithId): boolean {
  const path = request.path ?? request.url?.split("?")[0] ?? "";
  return /\/generation\/stream$/.test(path);
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const requestId = request.requestId;

    if (isGenerationStreamRequest(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((body) => {
        if (isApiEnvelope(body)) {
          if (body.success === true && "meta" in body && body.meta) {
            return body;
          }
          if (body.success === false) {
            return body;
          }
        }

        if (body === undefined || body === null) {
          return apiSuccess(undefined, undefined, requestId);
        }

        if (typeof body === "object" && "message" in body && "data" in body) {
          const record = body as { message?: string; data?: unknown };
          return apiSuccess(record.data, record.message, requestId);
        }

        return apiSuccess(body, undefined, requestId);
      }),
    );
  }
}
