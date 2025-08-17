import React from "react";
import { Link } from "react-router-dom";

const RecipeCard = ({ recipe }) => {
  const fallbackImage = `https://dummyimage.com/400x300/e0e0e0/555.png&text=${encodeURIComponent(
    recipe.title
  )}`;
  const tags = recipe.tags
    ? recipe.tags
        .split(",")
        .map((tag) => tag.trim())
        .join(", ")
    : "Delicious recipe";

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card">
      <img
        src={recipe.image_url || fallbackImage}
        alt={recipe.title}
        className="recipe-card-image"
      />
      <div className="recipe-card-content">
        <h3>{recipe.title}</h3>
        <p>{tags}</p>
      </div>
    </Link>
  );
};

export default RecipeCard;
