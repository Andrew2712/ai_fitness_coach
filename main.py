import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from api import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
