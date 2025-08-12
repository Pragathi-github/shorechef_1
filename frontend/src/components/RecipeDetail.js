import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Chatbot from './Chatbot'; // We will embed the chatbot here

const API_URL = 'http://127.0.0.1:8000';

// Helper function to extract YouTube Video ID from URL
const getYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

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
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [recipeId]);

    if (loading) return <div className="loading">Loading recipe details...</div>;
    if (!recipe) return <div className="error">Recipe not found.</div>;
    
    const fallbackImage = `https://dummyimage.com/1200x400/856c54/fff.png&text=${encodeURIComponent(recipe.title)}`;
    const youtubeID = getYouTubeID(recipe.youtube_url);

    // Create a query for Blinkit from the ingredients list
    const ingredientsQuery = recipe.ingredients ? recipe.ingredients.split('\n').map(item => item.split(':')[0].replace(/[-*]/g, '').trim()).join(', ') : recipe.title;

    return (
        <div className="recipe-detail">
            <img 
              src={recipe.image_url || fallbackImage} 
              alt={recipe.title} 
              className="recipe-detail-header" 
              onError={(e) => { e.target.onerror = null; e.target.src=fallbackImage; }}
            />
            <h2>{recipe.title}</h2>

            <div className="recipe-main-content">
                <div className="recipe-info">
                    {youtubeID && (
                        <div className="recipe-section youtube-embed">
                            <h3>Watch Video</h3>
                            <iframe
                                width="100%"
                                height="315"
                                src={`https://www.youtube.com/embed/${youtubeID}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}
                    <div className="recipe-section">
                        <h3>Ingredients</h3>
                        <pre>{recipe.ingredients}</pre>
                    </div>
                     <div className="recipe-section">
                        <h3>Instructions</h3>
                        <pre>{recipe.instructions}</pre>
                    </div>
                </div>

                <div className="recipe-assistant">
                    <h3>Cooking Assistant</h3>
                    <div className="blinkit-section">
                        <a 
                            href={`https://www.blinkit.com/s?q=${encodeURIComponent(ingredientsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="blinkit-button"
                        >
                            Order Ingredients on Blinkit
                        </a>
                    </div>
                    {/* Pass recipe title and instructions to the chatbot */}
                    <Chatbot 
                        recipeTitle={recipe.title}
                        recipeInstructions={recipe.instructions}
                    />
                </div>
            </div>
        </div>
    );
}

export default RecipeDetail;