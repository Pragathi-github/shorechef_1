import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Chatbot from "./Chatbot";
import "./RecipeDetail.css";

const RecipeDetail = () => {
  const { recipeId } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchRecipe = async () => {
      setRecipe(null);
      setError(null);
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/recipes/${recipeId}?lang=${i18n.language}`
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        setRecipe(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchRecipe();
  }, [recipeId, i18n.language]);

  const renderContent = () => {
    if (error) return <div className="error">Error: {error}</div>;
    if (!recipe) return <div className="loading">Loading...</div>;

    return (
      <main className="main-content">
        <div className="recipe-info-panel">
          <h2>{recipe.title}</h2>
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="recipe-image-large"
          />
          <h3>{t("Ingredients")}</h3>
          <pre>{recipe.ingredients}</pre>
          <h3>{t("Instructions")}</h3>
          <pre>{recipe.instructions}</pre>

          {/* --- THIS IS THE NEW SECTION --- */}
          {/* It only displays if nutrition data exists for the recipe */}
          {recipe.nutrition && (
            <>
              <h3>{t("Nutrition")}</h3>
              <pre>{recipe.nutrition}</pre>
            </>
          )}
        </div>

        <div className="cooking-assistant-panel">
          <Chatbot
            recipeTitle={recipe.title}
            recipeInstructions={recipe.instructions}
          />
        </div>
      </main>
    );
  };

  return (
    <div className="recipe-detail-page">
      <header className="app-header">
        <h1>
          <Link to="/">{t("ShoreChef")}</Link>
        </h1>
      </header>
      {renderContent()}
    </div>
  );
};

export default RecipeDetail;
