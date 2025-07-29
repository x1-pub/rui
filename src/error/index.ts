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
