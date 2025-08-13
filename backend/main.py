import os
import re
import logging
import uuid
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from typing import List
from typing import Optional
from fastapi import Query


# --- Configuration ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Constants ---
CHROMA_DATA_PATH = "chroma_data"
RECIPES_COLLECTION_NAME = "recipes"
RECIPE_FILE = "Food recipes information.txt"
RECIPE_SEPARATOR = "---------------------------------------------"
NUM_CHROMA_RESULTS = 2

# --- Pydantic Models ---
class UserInput(BaseModel):
    message: str = Field(..., description="User's query.")
    response_language: str = Field("English", description="Desired response language.")
 # NEW: Add context to remember the current recipe and step
    conversation_context: dict | None = None

class ChatResponse(BaseModel):
    reply: str
    source: str
    suggested_ingredients_query: str | None = None
    conversation_context: dict | None = None

class Recipe(BaseModel):
    id: str
    title: str
    image_url: str | None = None  # <-- ADD THIS LINE
    region: str | None = None
    category: str | None = None
    cooking_time: str | None = None
    difficulty: str | None = None
    diet_type: str | None = None
    ingredients: str | None = None
    instructions: str | None = None
    nutrition: str | None = None
    tags: str | None = None

# --- FastAPI App ---
app = FastAPI(
    title="ShoreChef API",
    description="Backend for ShoreChef App.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gemini AI & ChromaDB Setup ---
gemini_model = None
collection = None
try:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not found.")
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
    logger.info("Gemini AI configured successfully.")

    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )
    collection = client.get_or_create_collection(
        name=RECIPES_COLLECTION_NAME,
        embedding_function=sentence_transformer_ef
    )
    logger.info(f"ChromaDB collection '{RECIPES_COLLECTION_NAME}' loaded/created.")

except Exception as e:
    logger.error(f"Fatal Error during initialization: {e}")

# --- Recipe Loading and Parsing Functions ---
def parse_recipe_text(text: str) -> dict:
    parsed_data = {}
    lines = text.strip().split('\n')
    current_section = None
    section_content = []
    key_pattern = re.compile(r'^([\w\s/]+):\s*(.*)')

    for line in lines:
        match = key_pattern.match(line)
        if match:
            if current_section and section_content:
                parsed_data[current_section] = '\n'.join(section_content).strip()
            key = match.group(1).strip().lower().replace(' ', '_').replace('/', '_')
            current_section = key
            section_content = [match.group(2).strip()]
        elif current_section:
            section_content.append(line.strip())

    if current_section and section_content:
        parsed_data[current_section] = '\n'.join(section_content).strip()

    final_data = {
        "title": parsed_data.get("recipe_title", ""),
        "image_url": parsed_data.get("imageurl", ""),
        "region": parsed_data.get("region", ""),
        "category": parsed_data.get("category", ""),
        "cooking_time": parsed_data.get("cooking_time", ""),
        "difficulty": parsed_data.get("difficulty", ""),
        "diet_type": parsed_data.get("diet_type", ""),
        "ingredients": parsed_data.get("ingredients", ""),
        "instructions": parsed_data.get("instructions", ""),
        "nutrition": parsed_data.get("nutrition", ""),
        "tags": parsed_data.get("tags", "")
    }
    return final_data

def load_recipes_if_needed():
    if not collection or collection.count() > 0:
        if collection: logger.info(f"Collection '{RECIPES_COLLECTION_NAME}' already has {collection.count()} items. Skipping load.")
        return

    logger.info(f"Loading recipes from '{RECIPE_FILE}'...")
    try:
        with open(RECIPE_FILE, 'r', encoding='utf-8') as f:
            content = f.read().lstrip('\ufeff')
    except FileNotFoundError:
        logger.error(f"Recipe file '{RECIPE_FILE}' not found.")
        return

    raw_recipes = content.split(RECIPE_SEPARATOR)
    documents, metadatas, ids = [], [], []

    for recipe_text in raw_recipes:
        if not recipe_text.strip(): continue

        parsed_recipe = parse_recipe_text(recipe_text)
        title = parsed_recipe.get('title')

        if not title:
            first_line = recipe_text.strip().split('\n')[0]
            logger.warning(f"Skipping recipe block with no title. Starts with: '{first_line[:50]}...'")
            continue

        recipe_id = f"recipe_{re.sub(r'\\W+', '_', title.lower()).strip('_')}"
        if not recipe_id: recipe_id = f"recipe_{uuid.uuid4()}"

        full_document_text = f"Title: {title}\nRegion: {parsed_recipe.get('region', '')}\nCategory: {parsed_recipe.get('category', '')}\nTags: {parsed_recipe.get('tags', '')}\n\nIngredients:\n{parsed_recipe['ingredients']}\n\nInstructions:\n{parsed_recipe['instructions']}"
        documents.append(full_document_text)
        metadatas.append(parsed_recipe)
        ids.append(recipe_id)

    if documents:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        logger.info(f"Upserted {len(documents)} recipes into ChromaDB.")

load_recipes_if_needed()

# --- Helper Functions ---
def query_chromadb(query_text: str, n_results: int = 1) -> list[dict] | None:
    if not collection: return None
    try:
        results = collection.query(query_texts=[query_text], n_results=n_results, include=['metadatas', 'documents'])
        if not results or not results.get('ids') or not results['ids'][0]: return None

        return [{"id": results['ids'][0][i], "document": results['documents'][0][i], "metadata": results['metadatas'][0][i]} for i in range(len(results['ids'][0]))]
    except Exception as e:
        logger.error(f"Error querying ChromaDB: {e}")
        return None

def get_gemini_response(full_prompt: str) -> tuple[str | None, str]:
    if not gemini_model: return None, "error_gemini_unavailable"
    try:
        response = gemini_model.generate_content(full_prompt)
        if response.parts:
            response_text = "".join(part.text for part in response.parts).strip()
            if response_text: return response_text, "success"

        logger.warning(f"Gemini returned an empty or blocked response. Feedback: {response.prompt_feedback}")
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
            if "SAFETY" in str(response.prompt_feedback.block_reason).upper(): return None, "error_gemini_safety"
            return None, "error_gemini_blocked"
        return None, "error_gemini_empty_response"
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return None, "error_gemini_api_call"

# --- RAG Prompt Template ---

# In main.py, replace the old RAG_PROMPT_TEMPLATE

RAG_PROMPT_TEMPLATE = """
You are ShoreChef, a step-by-step cooking assistant. Your goal is to guide the user through a specific recipe.

**Instructions:**
1.  You will be given the full instructions for a recipe as context.
2.  You will also be given a "Current Step" number.
3.  Your task is to respond ONLY with the instruction for that specific step.
4.  If the user asks for the "first step" or "step 1", provide the first instruction.
5.  If the Current Step number is beyond the last instruction, state that the recipe is complete.
6.  DO NOT provide the entire recipe at once. Respond only with the single, specific step requested.
7.  Your entire response must be in {response_language}.

--- START RECIPE CONTEXT ---
Recipe Title: {recipe_title}
Instructions:
{instructions}
--- END RECIPE CONTEXT ---

User's Request: Give me step {current_step}

ShoreChef's Answer (in {response_language}):
"""

# --- API Endpoints ---
# Add this new endpoint to your main.py file

@app.get("/recipes/categories", response_model=List[str])
async def get_all_categories():
    """Returns a list of all unique recipe categories."""
    if not collection:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        # Get all metadata from the collection
        metadatas = collection.get(include=["metadatas"])['metadatas']
        if not metadatas:
            return []
        
        # Extract unique categories
        unique_categories = set()
        for meta in metadatas:
            if meta.get('category'):
                # Handle categories that might have multiple parts like "Snack / Appetizer"
                categories = [c.strip() for c in meta['category'].split('/')]
                unique_categories.update(categories)
                
        return sorted(list(unique_categories))
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch categories.")
@app.get("/recipes", response_model=list[Recipe])
async def get_all_recipes():
    if not collection: raise HTTPException(status_code=503, detail="Database not available.")
    try:
        results = collection.get(include=["metadatas"])
        if not results or not results.get('ids'): return []
        return [Recipe(id=results['ids'][i], **results['metadatas'][i]) for i in range(len(results['ids']))]
    except Exception as e:
        logger.error(f"Error fetching all recipes: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch recipes.")
@app.get("/recipes", response_model=list[Recipe])
async def get_all_recipes(category: Optional[str] = Query(None)):
    """Returns a list of all recipes, optionally filtered by category."""
    if not collection:
        raise HTTPException(status_code=503, detail="Database not available.")
    try:
        results = collection.get(include=["metadatas"])
        if not results or not results.get('ids'):
            return []
        
        recipe_list = [
            Recipe(id=results['ids'][i], **results['metadatas'][i])
            for i in range(len(results['ids']))
        ]

        # If a category is provided, filter the results
        if category:
            filtered_list = [
                recipe for recipe in recipe_list 
                if recipe.category and category.lower() in recipe.category.lower()
            ]
            return filtered_list
            
        return recipe_list
    except Exception as e:
        logger.error(f"Error fetching all recipes: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch recipes.")

@app.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe_by_id(recipe_id: str):
    if not collection: raise HTTPException(status_code=503, detail="Database not available.")
    try:
        result = collection.get(ids=[recipe_id], include=["metadatas"])
        if not result or not result['ids']: raise HTTPException(status_code=404, detail="Recipe not found.")
        return Recipe(id=result['ids'][0], **result['metadatas'][0])
    except Exception as e:
        logger.error(f"Error fetching recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch recipe.")

# In main.py, replace the entire @app.post("/chat") function

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(user_input: UserInput):
    user_message = user_input.message.strip().lower()
    response_language = user_input.response_language.strip()
    context = user_input.conversation_context or {}

    recipe_title = context.get("recipe_title")
    instructions = context.get("instructions")
    current_step = context.get("current_step", 0)

    if not recipe_title or not instructions:
        return ChatResponse(reply="Sorry, I don't have a recipe context. Please select a recipe first.", source="error_no_context")

    # Determine which step to fetch
    if "next" in user_message or "what's next" in user_message:
        current_step += 1
    elif "previous" in user_message or "go back" in user_message:
        current_step = max(1, current_step - 1)
    elif "start" in user_message or "first step" in user_message:
        current_step = 1
    # Simple check for a number in the message, e.g., "read step 3"
    elif any(char.isdigit() for char in user_message):
        nums = re.findall(r'\d+', user_message)
        if nums:
            current_step = int(nums[0])
    else: # Default to starting or repeating current step
        current_step = max(1, current_step)


    final_prompt = RAG_PROMPT_TEMPLATE.format(
        recipe_title=recipe_title,
        instructions=instructions,
        current_step=current_step,
        response_language=response_language
    )

    response_text, gemini_status = get_gemini_response(final_prompt)

    if gemini_status == "success" and response_text:
        # Update the context for the next turn
        new_context = {
            "recipe_title": recipe_title,
            "instructions": instructions,
            "current_step": current_step
        }
        return ChatResponse(reply=response_text, source="rag_step_by_step", conversation_context=new_context)
    else:
        return ChatResponse(reply="I'm sorry, I had trouble fetching that step.", source=gemini_status)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ShoreChef API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)