import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";
import { apiSuccess, isApiEnvelope } from "../common/api-response";
import { SKIP_RESPONSE_WRAP_KEY } from "../decorators/skip-response-wrap.decorator";
import { RequestWithId } from "../middleware/request-id.middleware";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const requestId = request.requestId;

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
