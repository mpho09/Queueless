import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import TextField from '../components/ui/TextField.jsx'
import PasswordField from '../components/ui/PasswordField.jsx'
import Checkbox from '../components/ui/Checkbox.jsx'
import AuthCard from '../components/layout/AuthCard.jsx'

describe('TextField', () => {
  test('the label names the input, and an error is announced with it', () => {
    render(<TextField label="Email" value="joy" onChange={() => {}} error="Enter a valid email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email')
  })

  test('a hint is described without marking the field invalid', () => {
    render(<TextField label="Email" value="" onChange={() => {}} hint="We never share it" />)
    const input = screen.getByLabelText('Email')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAccessibleDescription('We never share it')
  })
})

describe('PasswordField', () => {
  function Controlled(props) {
    const [value, setValue] = useState('')
    return <PasswordField value={value} onChange={(e) => setValue(e.target.value)} {...props} />
  }

  test('hidden by default; the eye shows and hides it', async () => {
    render(<Controlled />)
    const input = screen.getByLabelText('Password')
    await userEvent.type(input, 'Secret123')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('Secret123')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  test('the error wins over success and hint, and marks the field invalid', () => {
    render(<PasswordField value="x" onChange={() => {}} hint="Hint" success="Fine" error="Too weak" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Too weak')
  })

  test('success shows when there is no error', () => {
    render(<PasswordField value="x" onChange={() => {}} hint="Hint" success="Password requirements met" />)
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password requirements met')
  })
})

describe('Checkbox', () => {
  test('clicking the label ticks it, and the label can hold a link', async () => {
    const onChange = jest.fn()
    render(
      <Checkbox checked={false} onChange={onChange}>
        I agree to the <a href="/privacy">Privacy Notice</a>
      </Checkbox>,
    )
    expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy')
    await userEvent.click(screen.getByText(/I agree to the/))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

test('AuthCard shows the page title as the heading', () => {
  render(<AuthCard title="Create your account">form</AuthCard>)
  expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
})
