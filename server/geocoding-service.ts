// Geocoding service for converting addresses to GPS coordinates
// Uses multiple free geocoding services with fallbacks

interface GeocodeResult {
  latitude: string;
  longitude: string;
  formatted_address?: string;
}

/**
 * Geocode an address using Nominatim (OpenStreetMap) - free service
 */
async function geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'School-Bus-Route-Manager/1.0 (educational-use)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat).toFixed(8),
        longitude: parseFloat(result.lon).toFixed(8),
        formatted_address: result.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

/**
 * Geocode an address using Mapbox (requires API key but has free tier)
 */
async function geocodeWithMapbox(address: string): Promise<GeocodeResult | null> {
  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.log('Mapbox token not available, skipping Mapbox geocoding');
      return null;
    }
    
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.center;
      
      return {
        latitude: latitude.toFixed(8),
        longitude: longitude.toFixed(8),
        formatted_address: feature.place_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return null;
  }
}

/**
 * Main geocoding function with multiple service fallbacks
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }
  
  console.log(`🗺️ Geocoding address: ${address}`);
  
  // Try Mapbox first (more accurate for US addresses)
  let result = await geocodeWithMapbox(address);
  if (result) {
    console.log(`✅ Mapbox geocoding successful: ${result.latitude}, ${result.longitude}`);
    return result;
  }
  
  // Fallback to Nominatim (free service)
  result = await geocodeWithNominatim(address);
  if (result) {
    console.log(`✅ Nominatim geocoding successful: ${result.latitude}, ${result.longitude}`);
    return result;
  }
  
  console.warn(`❌ Geocoding failed for address: ${address}`);
  return null;
}

/**
 * Validate GPS coordinates
 */
export function validateCoordinates(latitude: string, longitude: string): boolean {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  return (
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180
  );
}

/**
 * Calculate distance between two GPS coordinates (in kilometers)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}