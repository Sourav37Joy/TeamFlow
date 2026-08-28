import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_AUTHENTICATED'
  | 'ROLE_NOT_PERMITTED'
  | 'NOT_FOUND'
  | 'CONFIRMATION_REQUIRED'
  | 'WARNINGS_NOT_ACKNOWLEDGED'
  | 'RULE_VIOLATION';

export type RuleCode =
  | 'DUPLICATE_ROLE_REQUIREMENT'
  | 'DUPLICATE_EMPLOYEE_SKILL'
  | 'DUPLICATE_ASSIGNMENT'
  | 'END_BEFORE_START'
  | 'REPLACEMENT_SAME_EMPLOYEE'
  | 'REPLACEMENT_INCOMING_ALREADY_ASSIGNED'
  | 'REPLACEMENT_DATE_OUT_OF_RANGE'
  | 'REPLACEMENT_ASSIGNMENT_ENDED'
  | 'ROLE_ALREADY_STAFFED';

export interface FieldDetail {
  field: string;
  value?: unknown;
  permitted: string;
  code: string;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: FieldDetail[];
    [extra: string]: unknown;
  };
}

function body(code: ErrorCode, message: string, extra: Record<string, unknown> = {}): ErrorBody {
  return { error: { code, message, ...extra } };
}

// Every refusal names the offending field and its permitted values (FR-078).
export class ValidationFailed extends HttpException {
  constructor(details: FieldDetail[]) {
    const first = details[0];
    const message = first
      ? `${first.field} is not acceptable: permitted ${first.permitted}.`
      : 'Request failed validation.';
    super(body('VALIDATION_FAILED', message, { details }), HttpStatus.BAD_REQUEST);
  }
}

export class NotAuthenticated extends HttpException {
  constructor() {
    super(
      body('NOT_AUTHENTICATED', 'Sign in to continue. This request carried no valid session.'),
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// A refusal names the action and the role it requires (FR-085).
export class RoleNotPermitted extends HttpException {
  constructor(action: string, requiredRole: string, heldRole: string) {
    super(
      body(
        'ROLE_NOT_PERMITTED',
        `${action} requires the ${requiredRole} role. You hold ${heldRole}. Nothing was changed.`,
        { action, requiredRole, heldRole },
      ),
      HttpStatus.FORBIDDEN,
    );
  }
}

export class NotFound extends HttpException {
  constructor(entity: string, id: string) {
    super(body('NOT_FOUND', `No ${entity} exists with id ${id}.`), HttpStatus.NOT_FOUND);
  }
}

// A destructive delete names what would go with it before it proceeds (FR-006, FR-013).
export class ConfirmationRequired extends HttpException {
  constructor(message: string, wouldRemove: unknown[]) {
    super(
      body('CONFIRMATION_REQUIRED', message, { wouldRemove }),
      HttpStatus.CONFLICT,
    );
  }
}

// Overallocation is surfaced, never prevented; the caller acknowledges and proceeds (Constitution VIII).
export class WarningsNotAcknowledged extends HttpException {
  constructor(warnings: unknown[]) {
    super(
      body(
        'WARNINGS_NOT_ACKNOWLEDGED',
        'This change is allowed but has warnings. Resend with acknowledgeWarnings set to true to proceed.',
        { warnings },
      ),
      HttpStatus.CONFLICT,
    );
  }
}

export class RuleViolation extends HttpException {
  constructor(code: RuleCode, message: string, extra: Record<string, unknown> = {}) {
    super(
      body('RULE_VIOLATION', message, { ruleCode: code, ...extra }),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
