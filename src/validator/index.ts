/**
 * ge <= gt < NUMBER < lt <= le
 * ge <= gt < STRING.length < lt <= le
 * ge <= gt < ARRAY.length < lt <= le
 */
interface RangeRule {
  ge?: number;
  le?: number;
  lt?: number;
  gt?: number;
}

interface BasicRule<T> {
  custom?: (value: T) => boolean | Promise<boolean>;
  default?: T;
  required?: boolean;
}

interface StringRule extends BasicRule<string>, RangeRule {
  type: 'string';
  pattern?: RegExp;
  enum?: string[];
}

interface NumberRule extends BasicRule<number>, RangeRule {
  type: 'number';
  enum?: number[];
}

interface BooleanRule extends BasicRule<boolean> {
  type: 'boolean';
}

interface ArrayRule extends BasicRule<unknown[]>, RangeRule {
  type: 'array';
  items?: ValidationRule;
}

interface ObjectRule extends BasicRule<object> {
  type: 'object';
  properties?: {
    [key: string]: ValidationRule;
  };
}

interface AnyTypeRule extends BasicRule<any> {
  type: 'any';
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult<T> {
  valid: boolean;
  data: T;
  errors: ValidationError[];
}

export type ValidationRule =
  | StringRule
  | NumberRule
  | BooleanRule
  | ArrayRule
  | ObjectRule
  | AnyTypeRule

class Validator {
  private schema: ValidationRule

  constructor (schema: ValidationRule) {
    this.schema = schema
  }

  async test<T> (data: T): Promise<ValidationResult<T>> {
    const errors: ValidationError[] = []
    const result = await this.validate<T>(data, this.schema, '', errors)
    return {
      valid: errors.length === 0,
      data: result,
      errors
    }
  }

  private validate = async <T>(data: T, schema: ValidationRule, field: string, errors: ValidationError[]): Promise<T> => {
    if (data === undefined || data === null) {
      if (schema.required) {
        errors.push({ field, message: 'is required' })
        return data
      }

      return (schema.default ?? data) as T
    }

    // @ts-expect-error
    if (schema.custom && !(await Promise.resolve(schema.custom(data)))) {
      errors.push({ field, message: 'custom validation failed' })
      return data
    }

    switch (schema.type) {
      case 'string':
        if (typeof data !== 'string') {
          errors.push({ field, message: 'must be a string' })
          return data
        }

        if (schema.gt !== undefined && data.length <= schema.gt) {
          errors.push({ field, message: `length cannot be greater than ${schema.gt}` })
          return data
        }

        if (schema.lt !== undefined && data.length >= schema.lt) {
          errors.push({ field, message: `length cannot be less than ${schema.lt}` })
          return data
        }

        if (schema.ge !== undefined && data.length < schema.ge) {
          errors.push({ field, message: `length cannot be greater than or equal ${schema.ge}` })
          return data
        }

        if (schema.le !== undefined && data.length > schema.le) {
          errors.push({ field, message: `length cannot be less than or equal ${schema.le}` })
          return data
        }

        if (schema.pattern && !schema.pattern.test(data)) {
          errors.push({ field, message: 'format is incorrect' })
          return data
        }

        if (schema.enum && !schema.enum.includes(data)) {
          errors.push({ field, message: `must be one of (${schema.enum.join(', ')})` })
          return data
        }

        return data
      case 'number':
        const checkStringNumberPassed = typeof data === 'string' && Number(data).toString() === data

        if (typeof data !== 'number' && !checkStringNumberPassed) {
          errors.push({ field, message: 'must be a number' })
          return data
        }

        if (schema.ge !== undefined && Number(data) < schema.ge) {
          errors.push({ field, message: `cannot be less than ${schema.ge}` })
          return data
        }

        if (schema.gt !== undefined && Number(data) <= schema.gt) {
          errors.push({ field, message: `cannot be greater than ${schema.gt}` })
          return data
        }

        if (schema.lt !== undefined && Number(data) >= schema.lt) {
          errors.push({ field, message: `cannot be less than ${schema.lt}` })
          return data
        }

        if (schema.ge !== undefined && Number(data) < schema.ge) {
          errors.push({ field, message: `cannot be greater than or equal ${schema.ge}` })
          return data
        }

        if (schema.le !== undefined && Number(data) > schema.le) {
          errors.push({ field, message: `cannot be less than or equal ${schema.le}` })
          return data
        }

        if (schema.enum && !schema.enum.includes(data as number)) {
          errors.push({ field, message: `must be one of (${schema.enum.join(', ')})` })
          return data
        }

        return data
      case 'boolean':
        if (typeof data !== 'boolean') {
          errors.push({ field, message: 'must be a boolean' })
          return data
        }

        return data
      case 'array':
        if (!Array.isArray(data)) {
          errors.push({ field, message: 'must be an array' })
          return data
        }

        if (schema.gt !== undefined && data.length <= schema.gt) {
          errors.push({ field, message: `array length cannot be greater than ${schema.gt}` })
          return data
        }

        if (schema.lt !== undefined && data.length >= schema.lt) {
          errors.push({ field, message: `array length cannot be less than ${schema.lt}` })
          return data
        }

        if (schema.ge !== undefined && data.length < schema.ge) {
          errors.push({ field, message: `array length cannot be greater than or equal ${schema.ge}` })
          return data
        }

        if (schema.le !== undefined && data.length > schema.le) {
          errors.push({ field, message: `array length cannot be less than or equal ${schema.le}` })
          return data
        }

        if (schema.items) {
          const arrayResult = []
          for (let i = 0; i < data.length; i++) {
            arrayResult.push(await this.validate(data[i], schema.items, `${field.length > 0 ? field : 'Array'}[${i}]`, errors))
          }
          return arrayResult as T
        }

        return data
      case 'object':
        if (Object.prototype.toString.call(data).slice(8, -1) !== 'Object') {
          errors.push({ field, message: 'must be an object' })
          return data
        }

        if (schema.properties) {
          for (const propName in schema.properties) {
            if (!schema.properties.hasOwnProperty(propName)) {
              break
            }

            // @ts-expect-error
            const propData = (data)[propName]

            const propSchema = schema.properties[propName]

            // @ts-expect-error
            data[propName] = await this.validate(propData, propSchema, `${field.length > 0 ? field : 'Object'}.${propName}`, errors)
          }

          return data
        }

        return data
      default:
        return data
    }
  }
}

export default Validator
