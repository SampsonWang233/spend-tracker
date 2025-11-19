import { Navigate, Route, Routes } from 'react-router-dom';
import SummaryPage from './pages/SummaryPage.jsx';
import AddExpensePage from './pages/AddExpensePage.jsx';
import DetailPage from './pages/DetailPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<SummaryPage />} />
      <Route path="/add" element={<AddExpensePage />} />
      <Route path="/detail" element={<DetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

