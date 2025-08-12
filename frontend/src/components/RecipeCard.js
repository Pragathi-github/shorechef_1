import React from 'react';
import { Link } from 'react-router-dom';

function RecipeCard({ recipe }) {
  const fallbackImage = `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(recipe.title)}`;
  
  return (
    <Link to={`/recipes/${recipe.id}`} className="recipe-card">
      <img 
        src={recipe.image_url || fallbackImage} 
        alt={recipe.title} 
        className="recipe-card-image" 
        onError={(e) => { e.target.onerror = null; e.target.src=fallbackImage; }}
      />
      <div className="recipe-card-content">
        <h3>{recipe.title}</h3>
        <p>{recipe.tags || recipe.category || 'A delicious coastal dish'}</p>
      </div>
    </Link>
  );
}

export default RecipeCard;