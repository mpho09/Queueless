import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { MapPin, X } from 'lucide-react';
import { useSuburbs } from './useSuburbs';

const STORAGE_KEY = 'queueless.selectedSuburb';

export default function SuburbSelector({ onSuburbChange }) {
  const { data: suburbs = [], isLoading } = useSuburbs();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSuburbId = searchParams.get('suburb') || localStorage.getItem(STORAGE_KEY) || '';

  useEffect(() => {
    if (selectedSuburbId && !searchParams.get('suburb')) {
      const next = new URLSearchParams(searchParams);
      next.set('suburb', selectedSuburbId);
      setSearchParams(next, { replace: true });
    }
    if (onSuburbChange) onSuburbChange(selectedSuburbId || null);
  }, [selectedSuburbId, searchParams, setSearchParams, onSuburbChange]);

  const handleSelect = (event) => {
    const value = event.target.value;
    const next = new URLSearchParams(searchParams);
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
      next.set('suburb', value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      next.delete('suburb');
    }
    setSearchParams(next, { replace: true });
    if (onSuburbChange) onSuburbChange(value || null);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    const next = new URLSearchParams(searchParams);
    next.delete('suburb');
    setSearchParams(next, { replace: true });
    if (onSuburbChange) onSuburbChange(null);
  };

  return (
    <div className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-3 shadow-xs'>
      <label htmlFor='suburb-select' className='mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600'>
        <MapPin className='h-4 w-4 text-primary' aria-hidden='true' />
        Shopping Suburb
      </label>
      <div className='flex items-center gap-2'>
        <select id='suburb-select' aria-label='Select shopping suburb' value={selectedSuburbId} onChange={handleSelect} disabled={isLoading} className='w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none'>
          <option value=''>{isLoading ? 'Loading suburbs...' : 'All suburbs (nearby)'}</option>
          {suburbs.map((suburb) => (
            <option key={suburb.id} value={suburb.id}>
              {suburb.name}{suburb.city ? ' (' + suburb.city + ')' : ''}
            </option>
          ))}
        </select>
        {selectedSuburbId && (
          <button type='button' onClick={handleClear} aria-label='Clear suburb filter' className='inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'>
            <X className='h-3.5 w-3.5' aria-hidden='true' />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
