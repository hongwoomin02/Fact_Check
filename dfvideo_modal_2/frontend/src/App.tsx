import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import VideoPage from './pages/VideoPage';
import TextPage from './pages/TextPage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/text" element={<TextPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
