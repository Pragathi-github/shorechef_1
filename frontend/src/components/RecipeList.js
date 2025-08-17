import React, { useState, useEffect } from "react";
import axios from "axios";
import RecipeCard from "./RecipeCard";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const API_URL = "http://127.0.0.1:8000";

function RecipeList() {
  const { t, i18n } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // --- THIS IS THE CRUCIAL FRONTEND CHANGE ---
        // It sends the selected language to your backend API
        const recipesRes = await axios.get(
          `${API_URL}/recipes?lang=${i18n.language}`
        );

        const categoriesRes = await axios.get(`${API_URL}/recipes/categories`);

        setRecipes(recipesRes.data);
        setCategories(["All", ...categoriesRes.data]);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setRecipes([]);
        setCategories(["All"]);
      }
      setLoading(false);
    };
    fetchAllData();
    // This useEffect runs every time the language changes
  }, [i18n.language]);

  const filteredRecipes = recipes.filter((recipe) => {
    const categoryMatch =
      activeCategory === "All" ||
      (recipe.category && recipe.category.includes(activeCategory));
    const searchMatch = recipe.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return categoryMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="recipe-list-page">
        <header className="app-header">
          <h1>{t("ShoreChef")}</h1>
          <LanguageSwitcher />
        </header>
        <div className="loading">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="recipe-list-page">
      <header className="app-header">
        <h1>{t("ShoreChef")}</h1>
        <LanguageSwitcher />
      </header>
      <main className="container">
        <div className="homepage-header">
          <h1>{t("Udupi-Mangalore Cuisine")}</h1>
          <p>
            {t(
              "Discover authentic and delicious recipes from the heart of coastal Karnataka."
            )}
          </p>
          <div className="search-bar">
            <input
              type="text"
              placeholder={t("Search for Neer Dosa, Ghee Roast...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? "active" : ""}
              onClick={() => setActiveCategory(cat)}
            >
              {t(cat)}
            </button>
          ))}
        </div>
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default RecipeList;
