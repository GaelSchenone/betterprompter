import { Routes, Route, Navigate } from 'react-router-dom';
import Display from './pages/Display';
import Control from './pages/Control';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Display />} />
      <Route path="/control/:sessionId" element={<Control />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
