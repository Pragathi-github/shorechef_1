import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<RecipeList />} />
            <Route path="/recipes/:recipeId" element={<RecipeDetail />} />
            <Route path="/chat" element={<Chatbot />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;