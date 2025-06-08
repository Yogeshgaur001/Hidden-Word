import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Game from './pages/Game';

function App() {
  return (
    <Router>
      <Routes>
        // ...existing routes...
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;