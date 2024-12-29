import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Chat from './Chat';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<Home />} /> {/* Homepage asks the user what they want to learn */}
         <Route path="chat" element={<Chat />} /> {/* Chat page */}
        <Route path="about" element={<About />} /> {/* About page */}
      </Routes>
    </BrowserRouter>
  );
}
