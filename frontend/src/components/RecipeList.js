import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './RecipeCard';

const API_URL = 'http://127.0.0.1:8000';

function RecipeList() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API_URL}/recipes`)
            .then(response => {
                setRecipes(response.data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to fetch recipes. Please ensure the backend server is running.');
                setLoading(false);
                console.error(err);
            });
    }, []);

    if (loading) return <div className="loading">Loading delicious recipes...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '2rem' }}>Coastal Recipes</h2>
            <div className="recipe-grid">
                {recipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
        </div>
    );
}

export default RecipeList;