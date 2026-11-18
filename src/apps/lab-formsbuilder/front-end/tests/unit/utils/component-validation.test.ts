import { describe, test, expect } from '@jest/globals'
import {
  allowedValidationRules,
  supportsValidationRule,
  validationHintForType,
} from '@/apps/lab-formsbuilder/front-end/utils/component-validation'

describe('component-validation', () => {
  test('DatePicker only allows required', () => {
    expect(allowedValidationRules('DatePicker')).toEqual(['required'])
    expect(supportsValidationRule('DatePicker', 'minLength')).toBe(false)
    expect(validationHintForType('DatePicker')).toContain('required')
  })

  test('NumberInput allows min/max not length', () => {
    expect(supportsValidationRule('NumberInput', 'min')).toBe(true)
    expect(supportsValidationRule('NumberInput', 'minLength')).toBe(false)
  })

  test('InputText allows text rules and email', () => {
    expect(supportsValidationRule('InputText', 'pattern')).toBe(true)
    expect(supportsValidationRule('InputText', 'email')).toBe(true)
  })
})
