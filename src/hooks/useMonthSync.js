import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExpenseTracker } from '../providers/ExpenseTrackerProvider.jsx';

function parseMonthKey(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return { key: `${match[1]}-${match[2]}`, year, monthIndex };
}

export function useMonthSync() {
  const { state, tracker } = useExpenseTracker();
  const location = useLocation();
  const navigate = useNavigate();
  const lastSearchRef = useRef(location.search);
  const lastMonthKeyRef = useRef(state.monthKey);

  useEffect(() => {
    const prevSearch = lastSearchRef.current;
    const prevMonthKey = lastMonthKeyRef.current;

    const searchChanged = prevSearch !== location.search;
    const monthKeyChanged = prevMonthKey !== state.monthKey;

    if (!state.monthKey) {
      lastSearchRef.current = location.search;
      lastMonthKeyRef.current = state.monthKey;
      return;
    }

    if (searchChanged) {
      lastSearchRef.current = location.search;

      const params = new URLSearchParams(location.search);
      const monthParam = params.get('month');
      const parsed = parseMonthKey(monthParam);

      if (parsed) {
        if (parsed.key !== state.monthKey) {
          tracker.setMonth(parsed.year, parsed.monthIndex);
        } else {
          lastMonthKeyRef.current = state.monthKey;
        }
        return;
      }

      params.set('month', state.monthKey);
      const nextSearch = params.toString();
      navigate(
        `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
        { replace: true }
      );
      lastSearchRef.current = nextSearch ? `?${nextSearch}` : '';
      lastMonthKeyRef.current = state.monthKey;
      return;
    }

    if (monthKeyChanged) {
      lastMonthKeyRef.current = state.monthKey;
      const params = new URLSearchParams(location.search);
      const currentParam = params.get('month');
      if (currentParam !== state.monthKey) {
        params.set('month', state.monthKey);
        const nextSearch = params.toString();
        navigate(
          `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
          { replace: true }
        );
        lastSearchRef.current = nextSearch ? `?${nextSearch}` : '';
      }
    }
  }, [state.monthKey, location.search, location.pathname, tracker, navigate]);
}

