from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import random

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Coordinate(BaseModel):
    lat: float
    lng: float

class Boundary(BaseModel):
    type: str
    coordinates: List[List[List[float]]]

class NDVIRequest(BaseModel):
    boundaries: Boundary
    date: str

class NDVIZone(BaseModel):
    min: float
    max: float
    average: float
    count: int
    percentage: float

class NDVIResponse(BaseModel):
    average_ndvi: float
    min_ndvi: float
    max_ndvi: float
    ndvi_values: List[float]
    ndvi_image_url: str
    zones: List[NDVIZone]

@app.get("/")
async def root():
    return {"message": "SmartAgroX Satellite API"}

@app.post("/api/ndvi", response_model=NDVIResponse)
async def get_ndvi(request: NDVIRequest):
    """
    Calculate NDVI for a field based on boundaries and date.
    This is a mock implementation that returns random NDVI data.
    In a real implementation, this would fetch data from Sentinel Hub or similar service.
    """
    try:
        # Parse date
        target_date = datetime.strptime(request.date, "%Y-%m-%d")
        
        # In a real implementation, we would:
        # 1. Convert boundaries to a bounding box
        # 2. Request Sentinel-2 imagery for the date range
        # 3. Calculate NDVI from the NIR and RED bands
        # 4. Return statistics and potentially an image URL
        
        # For now, we'll generate mock data
        
        # Generate a somewhat realistic NDVI value based on the date (season)
        # Higher in summer, lower in winter
        month = target_date.month
        season_factor = 0.5 + 0.3 * np.sin((month - 3) * np.pi / 6)  # Peak in July
        
        # Add some randomness
        base_ndvi = season_factor + random.uniform(-0.15, 0.15)
        base_ndvi = max(0.05, min(0.95, base_ndvi))  # Constrain between 0.05 and 0.95
        
        # Create a distribution of NDVI values
        num_samples = 1000
        ndvi_values = np.random.normal(base_ndvi, 0.1, num_samples)
        ndvi_values = np.clip(ndvi_values, 0, 1)  # NDVI ranges from 0 to 1
        
        # Calculate statistics
        avg_ndvi = float(np.mean(ndvi_values))
        min_ndvi = float(np.min(ndvi_values))
        max_ndvi = float(np.max(ndvi_values))
        
        # Create zones for visualization
        zone_edges = np.linspace(min_ndvi, max_ndvi, 6)
        zones = []
        
        for i in range(5):
            zone_data = ndvi_values[(ndvi_values >= zone_edges[i]) & (ndvi_values < zone_edges[i+1])]
            if len(zone_data) > 0:
                zones.append(NDVIZone(
                    min=float(zone_edges[i]),
                    max=float(zone_edges[i+1]),
                    average=float(np.mean(zone_data)),
                    count=int(len(zone_data)),
                    percentage=float(len(zone_data) / len(ndvi_values) * 100)
                ))
        
        # In a real implementation, we would generate an image and store it
        # Here we just use a placeholder URL
        ndvi_image_url = f"https://example.com/ndvi-images/{target_date.strftime('%Y-%m-%d')}"
        
        # Return sampled values for visualization
        sample_size = min(100, len(ndvi_values))
        sampled_values = np.random.choice(ndvi_values, sample_size, replace=False).tolist()
        
        return NDVIResponse(
            average_ndvi=avg_ndvi,
            min_ndvi=min_ndvi,
            max_ndvi=max_ndvi,
            ndvi_values=sampled_values,
            ndvi_image_url=ndvi_image_url,
            zones=zones
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing NDVI data: {str(e)}")

@app.get("/api/historical-ndvi")
async def get_historical_ndvi(
    min_lon: float, 
    min_lat: float, 
    max_lon: float, 
    max_lat: float, 
    start_date: str, 
    end_date: str
):
    """
    Get historical NDVI data for a region.
    This is a mock implementation that returns random data for demonstration.
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        # Generate data points at 15-day intervals
        dates = []
        ndvi_values = []
        current = start
        
        # Start with a random but reasonable NDVI value
        last_ndvi = 0.4 + random.uniform(-0.1, 0.1)
        
        while current <= end:
            dates.append(current.strftime("%Y-%m-%d"))
            
            # Add some time correlation and seasonal effects
            month = current.month
            season_factor = 0.5 + 0.3 * np.sin((month - 3) * np.pi / 6)  # Peak in July
            
            # Move toward the seasonal factor with some randomness
            trend_factor = 0.7  # How strongly we trend toward seasonal norm
            random_factor = 0.3  # How much randomness to add
            
            last_ndvi = (trend_factor * season_factor + 
                        (1 - trend_factor) * last_ndvi + 
                        random.uniform(-0.05, 0.05) * random_factor)
            
            # Keep within reasonable bounds
            last_ndvi = max(0.1, min(0.9, last_ndvi))
            ndvi_values.append(last_ndvi)
            
            # Move forward by 16 days (typical Sentinel-2 revisit rate)
            current += timedelta(days=16)
        
        return {
            "dates": dates,
            "ndvi_values": ndvi_values
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing historical NDVI: {str(e)}")

@app.get("/api/satellite-imagery")
async def get_satellite_imagery(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    date: str,
    bands: str = "true-color"  # Options: true-color, false-color, ndvi
):
    """
    Get satellite imagery for a region.
    This is a mock implementation that returns a placeholder URL.
    """
    try:
        # Parse date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        # In a real implementation, this would connect to a satellite imagery service
        # and return the URL of the generated image
        
        # For now, return a placeholder URL
        return {
            "image_url": f"https://example.com/satellite-images/{bands}/{target_date.strftime('%Y-%m-%d')}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching satellite imagery: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 