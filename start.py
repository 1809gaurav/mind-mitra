#!/usr/bin/env python3
"""
MindMitra Backend Startup Script
This script helps you start the MindMitra backend in development mode.
use Wsl And Linux For speed 
"""

import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")


def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import motor
        print("✅ Required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r requirements.txt")
        return False


def setup_environment():
    """Setup environment variables"""
    env_file = Path(".env")
    if not env_file.exists():
        print("📝 Creating .env file from template...")
        try:
            with open("env.example", "r") as f:
                template = f.read()
            
            with open(".env", "w") as f:
                f.write(template)
            
            print("✅ .env file created. Please update it with your configuration.")
        except FileNotFoundError:
            print("❌ env.example file not found")
            return False
    else:
        print("✅ .env file already exists")
    
    return True


def create_uploads_directory():
    """Create uploads directory if it doesn't exist"""
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        uploads_dir.mkdir()
        print("✅ Created uploads directory")
    else:
        print("✅ Uploads directory already exists")


def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting MindMitra Backend...")
    print("📖 API Documentation will be available at: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("⏹️  Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")


def main():
    """Main startup function"""
    print("🧠 MindMitra Backend Startup")
    print("=" * 40)
    
    # Check Python version
    check_python_version()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Create uploads directory
    create_uploads_directory()
    
    # Start server
    start_server()


if __name__ == "__main__":
    main() 
