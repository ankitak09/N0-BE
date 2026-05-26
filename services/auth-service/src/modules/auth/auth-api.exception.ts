import { HttpException, HttpStatus } from "@nestjs/common";

/** Error shape expected by N0-FE-POC auth-api client. */
export class AuthApiException extends HttpException {
  constructor(
    status: HttpStatus,
    message: string,
    errors?: Record<string, string>,
  ) {
    super(errors ? { message, errors } : { message }, status);
  }
}
