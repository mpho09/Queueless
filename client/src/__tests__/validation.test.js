import { isValidPrice } from '../utils/validation.js'

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
