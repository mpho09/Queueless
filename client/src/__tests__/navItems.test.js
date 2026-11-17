import { navItems } from '../components/layout/navItems.js'

const activeLabels = (path) => navItems.filter((item) => item.matches(path)).map((item) => item.label)

describe('navItems', () => {
  test('has Home, Basket, Savings and Stores', () => {
    expect(navItems.map((item) => item.label)).toEqual(['Home', 'Basket', 'Savings', 'Stores'])
  })

  test('exactly one item is active on each main page', () => {
    expect(activeLabels('/')).toEqual(['Home'])
    expect(activeLabels('/basket')).toEqual(['Basket'])
    expect(activeLabels('/savings')).toEqual(['Savings'])
    expect(activeLabels('/stores')).toEqual(['Stores'])
  })

  test('a store page and its report screen still belong to Home', () => {
    expect(activeLabels('/stores/abc')).toEqual(['Home'])
    expect(activeLabels('/stores/abc/report')).toEqual(['Home'])
  })
})
