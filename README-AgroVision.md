# AgroVision: Real-Time Satellite Crop Health Intelligence

AgroVision is a powerful satellite imagery analysis feature for the SmartAgroX platform that helps farmers monitor crop health using NDVI (Normalized Difference Vegetation Index) data derived from satellite imagery in real-time.

## Real-Time Features

- **Live Satellite Data**: Connects to Sentinel Hub and Planet APIs to fetch real-time satellite imagery
- **Automatic Updates**: Configurable auto-refresh settings to keep data current
- **Intelligent Caching**: Optimizes API usage with smart caching strategies
- **Offline Resilience**: Falls back to cached data when connectivity is limited

## Technical Implementation

The AgroVision frontend is built with React and consists of several key components:

- **AgroVision.tsx**: Main page component with farm selection, date controls, and real-time refresh options
- **SatelliteMap.tsx**: Interactive map component showing NDVI overlays on satellite imagery
- **NDVIAnalytics.tsx**: Data visualization and analytics for NDVI time series data
- **ndviService.ts**: Service layer that processes and caches satellite data
- **satelliteApi.ts**: API integration layer for Sentinel Hub and Planet APIs

## API Integrations

AgroVision integrates with multiple satellite data providers:

1. **Sentinel Hub**: Primary source for Sentinel-2 satellite imagery with NDVI calculation
2. **Planet**: Optional high-resolution imagery source for enhanced analysis
3. **OpenWeatherMap**: Weather data correlation with vegetation health

## Setup Requirements

To use AgroVision with real-time satellite data, you'll need:

1. **API Keys**: Create accounts and obtain API keys from:
   - [Sentinel Hub](https://www.sentinel-hub.com/)
   - [Planet](https://www.planet.com/) (optional for higher resolution)
   - [OpenWeatherMap](https://openweathermap.org/) (for weather correlation)

2. **Environment Setup**: Create a `.env` file with the following variables:
   ```
   VITE_SENTINEL_HUB_API_KEY=your_sentinel_hub_api_key
   VITE_SENTINEL_HUB_INSTANCE_ID=your_instance_id
   VITE_PLANET_API_KEY=your_planet_api_key
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   VITE_OPENWEATHER_API_KEY=your_openweather_api_key
   ```

3. **Install Dependencies**: Run `npm install` to install all required packages

## Usage Guide

1. Create a farm with boundary polygons in the SmartAgroX platform
2. Access AgroVision at `/agrovision` in the web app
3. Select a farm and date to analyze
4. Toggle auto-refresh for continuous updates
5. Click on fields to analyze specific areas
6. View NDVI analytics and time series data

## Performance Considerations

- **API Rate Limits**: Be mindful of API usage limits from satellite providers
- **Caching Strategy**: Data is cached for 1 hour by default to minimize API calls
- **Image Processing**: GeoTIFF processing can be resource-intensive; optimize where possible

## Future Enhancements

- Multi-spectral band analysis beyond NDVI
- Machine learning predictions for crop yield estimation
- Integration with soil sensor data for comprehensive analysis
- Custom alerting for significant NDVI changes

## Troubleshooting

If you encounter issues with satellite data:

1. Verify API keys are correctly configured
2. Check network connectivity
3. Examine browser console for error messages
4. Try a different date range (cloud cover can affect data quality)
5. Ensure field boundaries are properly defined

## Technical Notes

The NDVI calculation uses the following formula:
NDVI = (NIR - RED) / (NIR + RED)

Where:
- NIR = Near Infrared band (Sentinel-2 band 8)
- RED = Red band (Sentinel-2 band 4)

NDVI values range from -1 to 1:
- < 0: Water, buildings, roads, or bare soil
- 0-0.2: Poor vegetation
- 0.2-0.4: Fair vegetation
- 0.4-0.6: Good vegetation
- 0.6-0.8: Very good vegetation
- > 0.8: Excellent vegetation 