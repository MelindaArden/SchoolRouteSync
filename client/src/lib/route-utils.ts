/**
 * Utility functions for route display and formatting
 */

interface RouteWithSchools {
  id: number;
  name: string;
  schools?: any[];
  driverFirstName?: string;
  driverLastName?: string;
}

/**
 * Generate a clean display name for a route without any school counts
 * Only shows the actual route name without hardcoded numbers
 */
export function formatRouteDisplayName(route: RouteWithSchools): string {
  if (!route) return 'Unknown Route';
  
  // Get the base name without any school count
  let baseName = route.name;
  
  // Remove any existing school count pattern like "- X Schools" or "- X School"
  baseName = baseName.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
  
  // Return just the clean route name without any count
  return baseName.trim();
}

/**
 * Get route name with driver info only (no school counts)
 */
export function formatRouteWithDriver(route: RouteWithSchools): string {
  if (!route) return 'Unknown Route';
  
  // Get clean base name without any school counts
  const baseName = route.name.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
  
  // If route name already contains driver name, return clean name
  if (route.name.includes(route.driverFirstName || '') || route.name.includes(route.driverLastName || '')) {
    return baseName;
  }
  
  // If driver info is available but not in route name, add it
  if (route.driverFirstName && route.driverLastName) {
    return `${route.driverFirstName} ${route.driverLastName} Route`;
  }
  
  // Fallback to just clean route name
  return baseName;
}

/**
 * Extract base route name without school count or driver info
 */
export function getBaseRouteName(routeName: string): string {
  if (!routeName) return 'Route';
  
  // Remove school count pattern
  let baseName = routeName.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
  
  // Remove "Route" suffix if it exists
  baseName = baseName.replace(/\s+Route\s*$/i, '');
  
  return baseName.trim() || 'Route';
}