import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RecipeList from "./components/RecipeList";
import RecipeDetail from "./components/RecipeDetail";
import { LanguageProvider } from "./context/LanguageProvider";
import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<RecipeList />} />
            <Route path="/recipe/:recipeId" element={<RecipeDetail />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
