"""
Quick script to check registered routes in your FastAPI app
Run this to see all available endpoints
"""

import requests

# Check the OpenAPI schema to see all registered routes
response = requests.get("http://localhost:8000/openapi.json")
if response.ok:
    schema = response.json()
    
    print("=" * 80)
    print("📍 REGISTERED ROUTES")
    print("=" * 80)
    
    paths = schema.get("paths", {})
    
    # Filter for individual processing routes
    individual_routes = {path: methods for path, methods in paths.items() 
                        if "individual" in path.lower() or "upload" in path.lower()}
    
    for path, methods in sorted(individual_routes.items()):
        for method, details in methods.items():
            if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                summary = details.get('summary', 'No summary')
                print(f"{method.upper():6} {path:50} - {summary}")
    
    print("=" * 80)
    
    # Check specifically for upload endpoint
    upload_endpoint = "/individual/upload/document"
    if upload_endpoint in paths:
        print(f"✅ Upload endpoint found: {upload_endpoint}")
        methods = list(paths[upload_endpoint].keys())
        print(f"   Available methods: {', '.join(m.upper() for m in methods)}")
    else:
        print(f"❌ Upload endpoint NOT found: {upload_endpoint}")
        print(f"   Looking for similar paths...")
        for path in paths:
            if "upload" in path.lower() or "document" in path.lower():
                print(f"   Found: {path}")
else:
    print(f"❌ Failed to fetch OpenAPI schema: {response.status_code}")