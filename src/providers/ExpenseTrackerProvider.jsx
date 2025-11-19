import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ExpenseTracker from '../lib/ExpenseTracker.js';

const ExpenseTrackerContext = createContext(null);

export function ExpenseTrackerProvider({ children }) {
  const [tracker] = useState(() => new ExpenseTracker());
  const [state, setState] = useState(tracker.getState());

  useEffect(() => {
    const unsubscribe = tracker.subscribe((nextState) => {
      setState(nextState);
    });

    return unsubscribe;
  }, [tracker]);

  const value = useMemo(() => ({ tracker, state }), [tracker, state]);

  return (
    <ExpenseTrackerContext.Provider value={value}>
      {children}
    </ExpenseTrackerContext.Provider>
  );
}

export function useExpenseTracker() {
  const context = useContext(ExpenseTrackerContext);
  if (!context) {
    throw new Error('useExpenseTracker must be used within an ExpenseTrackerProvider');
  }
  return context;
}

