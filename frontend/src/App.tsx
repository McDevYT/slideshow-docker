import { Routes, Route, Navigate, BrowserRouter } from 'react-router';
import Slideshow from './components/slideshow/Slideshow';
import Manager from './components/manager/Manager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Slideshow />} />

        <Route path="/dashboard" element={<Manager />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
