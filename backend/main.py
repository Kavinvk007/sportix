import sys
import os
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = None

try:
    from real_main import app as real_app
    app = real_app
except Exception as e:
    err_msg = traceback.format_exc()
    print("Vercel Init Error:", err_msg)
    
    app = FastAPI(title="Error Fallback App")
    
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all(path_name: str):
        return JSONResponse(status_code=500, content={"error": "Startup failed", "traceback": err_msg})
