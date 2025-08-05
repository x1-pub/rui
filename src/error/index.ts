import { ValidationErrorInfo } from "../validator"

export class RuiError extends Error {
  public statusCode: number
  public code?: string

  constructor (message: string, statusCode: number = 500, code?: string) {
    super(message)
    this.name = 'RuiError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends RuiError {
  public info: ValidationErrorInfo[]

  constructor (info: ValidationErrorInfo[]) {
    super('The verification request parameters failed')
    this.name = 'ValidationError'
    this.statusCode = 400
    this.code = 'PARAMETER_TYPE_ERROR'
    this.info = info
  }
}
