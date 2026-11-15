import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuburbSelector from '../SuburbSelector';
import { FALLBACK_SUBURBS } from '../useSuburbs';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

describe('SuburbSelector (#19)', () => {
  beforeEach(() => { localStorage.clear(); });
  test('renders available suburbs and allows selecting and clearing a suburb', async () => {
    const handleChange = jest.fn();
    renderWithProviders(<SuburbSelector onSuburbChange={handleChange} />);
    const select = await screen.findByLabelText(/select shopping suburb/i);
    const hatfield = FALLBACK_SUBURBS[0];
    fireEvent.change(select, { target: { value: hatfield.id } });
    expect(select.value).toBe(hatfield.id);
    expect(localStorage.getItem('queueless.selectedSuburb')).toBe(hatfield.id);
    expect(handleChange).toHaveBeenLastCalledWith(hatfield.id);
    const clearBtn = screen.getByRole('button', { name: /clear suburb filter/i });
    fireEvent.click(clearBtn);
    expect(select.value).toBe('');
    expect(localStorage.getItem('queueless.selectedSuburb')).toBeNull();
    expect(handleChange).toHaveBeenLastCalledWith(null);
  });
});
