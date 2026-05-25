import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { apiError } from "../common/api-error";
import { ErrorCode } from "../common/errors";
import { RequestWithId } from "../middleware/request-id.middleware";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId;

    const { status, code, message, details } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { requestId, path: request.url, code },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(apiError(code, message, requestId, details));
  }

  private normalize(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "object" && body !== null) {
        const record = body as Record<string, unknown>;
        const code =
          typeof record.code === "string"
            ? record.code
            : this.statusToCode(status);
        const message =
          typeof record.message === "string"
            ? record.message
            : Array.isArray(record.message)
              ? (record.message as string[]).join("; ")
              : exception.message;
        const details = record.details ?? record.errors;

        return { status, code, message, details };
      }

      return {
        status,
        code: this.statusToCode(status),
        message: typeof body === "string" ? body : exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
    }
  }
}
