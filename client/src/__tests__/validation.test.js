import { isValidPrice, isValidPassword, passwordProblems } from '../utils/validation.js'

describe('isValidPrice', () => {
  test.each(['34.99', 34.99, '35', '0.5', '0.01', ' 34.99 ', '99999999.99'])('%p is valid', (value) => {
    expect(isValidPrice(value)).toBe(true)
  })

  test.each([
    ['34.999', 'more than 2 decimals'],
    [34.999, 'more than 2 decimals (number)'],
    ['-1', 'negative'],
    [-1, 'negative (number)'],
    ['abc', 'not a number'],
    ['', 'empty'],
    ['0', 'zero'],
    ['0.00', 'zero with decimals'],
    ['1e3', 'scientific notation'],
    ['12,50', 'comma decimal'],
    ['100000000', 'too many digits for the database'],
    [null, 'null'],
    [undefined, 'undefined'],
  ])('%p is invalid (%s)', (value) => {
    expect(isValidPrice(value)).toBe(false)
  })
})

describe('password rules (PRD §5: 8+ characters, 1 uppercase letter, 1 number)', () => {
  test('accepts a password that meets every rule', () => {
    expect(isValidPassword('Groceries2026')).toBe(true)
    expect(isValidPassword('Abcdefg1')).toBe(true) // exactly 8
  })

  test('rejects each missing rule, and says which one', () => {
    expect(passwordProblems('Ab1')).toMatchObject({ tooShort: true, noUppercase: false, noNumber: false })
    expect(passwordProblems('groceries2026')).toMatchObject({ tooShort: false, noUppercase: true, noNumber: false })
    expect(passwordProblems('Groceries')).toMatchObject({ tooShort: false, noUppercase: false, noNumber: true })
    for (const bad of ['Ab1', 'groceries2026', 'Groceries', 'groceries', '12345678', '']) {
      expect(isValidPassword(bad)).toBe(false)
    }
  })

  test('spaces and symbols are allowed, and missing values are not valid', () => {
    expect(isValidPassword('My Pass word 1!')).toBe(true)
    expect(isValidPassword(undefined)).toBe(false)
    expect(isValidPassword(null)).toBe(false)
  })
})
