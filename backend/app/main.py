from fastapi import FastAPI
from app.database import init_db
from app.routes.plant import router as PlantRouter

app =  FastAPI()
app.router.include_router(PlantRouter, prefix='/api')

#Create database and tables on startup if not already exists
@app.on_event("startup")
def on_startup():
    init_db()
    

@app.get("/")
def index():
    return {"message":"Hello World!"}