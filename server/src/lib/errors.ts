// Erros de aplicação com código estável. Ver docs/backend-architecture.md (seção 3).

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "INVALID_CODE"
  | "EMAIL_TAKEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "Sessão inválida ou expirada") =>
  new AppError(401, "UNAUTHORIZED", message);
export const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
export const emailTaken = () => new AppError(409, "EMAIL_TAKEN", "Este e-mail já está cadastrado");
export const notFound = (what = "Recurso") => new AppError(404, "NOT_FOUND", `${what} não encontrado`);
export const invalidCode = () =>
  new AppError(400, "INVALID_CODE", "Código inválido, expirado ou com tentativas esgotadas");
