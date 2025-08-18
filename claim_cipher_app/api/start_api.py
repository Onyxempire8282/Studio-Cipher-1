#!/usr/bin/env python3
"""
Startup script for BCIF API
Ensures dependencies are installed and starts the Flask server
"""

import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Install required packages"""
    try:
        print("Installing Python dependencies...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ])
        print("Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False
    return True

def check_files():
    """Check if required files exist"""
    required_files = [
        'bcif_fill.py',
        'requirements.txt',
        '../config/bcif-mapping.json',
        '../forms/Fillable_CCC_BCIF.pdf'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("Missing required files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    
    print("All required files found")
    return True

def start_server():
    """Start the Flask API server"""
    try:
        print("Starting BCIF API server on http://localhost:5000")
        print("Available endpoints:")
        print("   - GET  /health - Health check")
        print("   - POST /fill-bcif - Fill BCIF form with extracted text")
        print("   - POST /extract-and-fill - Complete workflow from PDF file")
        print("   - POST /debug-extraction - Debug extraction results")
        print("\nPress Ctrl+C to stop the server\n")
        
        from bcif_api import app
        app.run(debug=True, host='0.0.0.0', port=5000)
        
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server failed to start: {e}")

def main():
    """Main startup sequence"""
    print("BCIF API Startup")
    print("=" * 40)
    
    # Change to script directory
    os.chdir(Path(__file__).parent)
    
    # Check for required files
    if not check_files():
        print("Startup failed: Missing required files")
        sys.exit(1)
    
    # Install dependencies
    if not install_requirements():
        print("Startup failed: Could not install dependencies")
        sys.exit(1)
    
    # Start the server
    start_server()

if __name__ == '__main__':
    main()