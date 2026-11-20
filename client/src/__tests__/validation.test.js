import { isValidEmail, isValidPassword, isValidPrice } from '../utils/validation.js'

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

describe('isValidPassword (PRD §5: 8+ characters, 1 uppercase letter, 1 number)', () => {
  test.each(['Groceries2026', 'ABCDEFG1', 'Shoprite 9!'])('%p is valid', (value) => {
    expect(isValidPassword(value)).toBe(true)
  })

  test.each([
    ['groceries2026', 'no uppercase letter (the Stitch error example)'],
    ['Groceries', 'no number'],
    ['Gro1', 'shorter than 8'],
    ['Abcdef1', '7 characters'],
    ['', 'empty'],
    [undefined, 'missing'],
  ])('%p is invalid: %s', (value) => {
    expect(isValidPassword(value)).toBe(false)
  })
})

describe('isValidEmail', () => {
  test.each(['joy@queueless.co.za', ' Joy.Shopper@Example.com '])('%p is valid', (value) => {
    expect(isValidEmail(value)).toBe(true)
  })

  test.each(['', 'joy', 'joy@', 'joy@queueless', 'joy @queueless.co.za', undefined])('%p is invalid', (value) => {
    expect(isValidEmail(value)).toBe(false)
  })
})
