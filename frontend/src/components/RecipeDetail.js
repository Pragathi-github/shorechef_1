import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000';

function RecipeDetail() {
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const { recipeId } = useParams();

    useEffect(() => {
        axios.get(`${API_URL}/recipes/${recipeId}`)
            .then(response => {
                setRecipe(response.data);
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [recipeId]);

    if (loading) return <div className="loading">Loading recipe...</div>;
    if (!recipe) return <div className="error">Recipe not found.</div>;

    const fallbackImage = `https://dummyimage.com/600x400/856c54/fff.png&text=${encodeURIComponent(recipe.title)}`;

    return (
        <div className="recipe-detail">
            <div className="recipe-detail-header">
                <img
                    src={recipe.image_url || fallbackImage}
                    alt={recipe.title}
                    className="recipe-detail-image"
                />
                <div className="recipe-detail-intro">
                    <h1>{recipe.title}</h1>
                    <div className="recipe-detail-tags">
                        {recipe.tags && recipe.tags.split(',').map(tag => (
                            <span key={tag}>{tag.trim()}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="recipe-body">
                <div className="ingredients-section">
                    <h3>Ingredients</h3>
                    <ul>
                        {recipe.ingredients && recipe.ingredients.split('\n').map((item, index) => (
                            <li key={index}>{item.replace(/[-*]/g, '').trim()}</li>
                        ))}
                    </ul>
                </div>
                <div className="instructions-section">
                    <h3>Instructions</h3>
                    <ol>
                        {recipe.instructions && recipe.instructions.split('\n').map((step, index) => (
                            <li key={index}>{step.replace(/^\d+\.\s*/, '').trim()}</li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default RecipeDetail;