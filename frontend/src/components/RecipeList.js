import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './RecipeCard';

const API_URL = 'http://127.0.0.1:8000';

function RecipeList() {
    const [allRecipes, setAllRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchRecipesAndCategories = async () => {
            try {
                const recipesRes = await axios.get(`${API_URL}/recipes`);
                const categoriesRes = await axios.get(`${API_URL}/recipes/categories`);
                
                setAllRecipes(recipesRes.data);
                setFilteredRecipes(recipesRes.data);
                setCategories(['All', ...categoriesRes.data]);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                setLoading(false);
            }
        };
        fetchRecipesAndCategories();
    }, []);

    useEffect(() => {
        let recipes = activeCategory === 'All' 
            ? allRecipes 
            : allRecipes.filter(r => r.category && r.category.includes(activeCategory));

        if (searchTerm) {
            recipes = recipes.filter(r => 
                r.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredRecipes(recipes);
    }, [searchTerm, activeCategory, allRecipes]);

    if (loading) return <div className="loading">Loading recipes...</div>;

    return (
        <div>
            <div className="homepage-header">
                <h1>Udupi-Mangalore Cuisine</h1>
                <p>Discover authentic and delicious recipes from the heart of coastal Karnataka.</p>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search for Neer Dosa, Ghee Roast..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="category-filters">
                {categories.map(cat => (
                    <button 
                        key={cat} 
                        className={activeCategory === cat ? 'active' : ''}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="recipe-grid">
                {filteredRecipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
        </div>
    );
}

export default RecipeList;