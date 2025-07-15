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
 * Generate a display name for a route with dynamic school count
 * This replaces hardcoded school counts in route names with actual counts
 */
export function formatRouteDisplayName(route: RouteWithSchools): string {
  if (!route) return 'Unknown Route';
  
  // Get the base name without hardcoded school count
  let baseName = route.name;
  
  // Remove any existing school count pattern like "- X Schools" or "- X School"
  baseName = baseName.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
  
  // Get actual school count
  const schoolCount = route.schools?.length || 0;
  
  // Generate display name with actual school count
  const schoolText = schoolCount === 1 ? 'School' : 'Schools';
  
  const result = `${baseName} - ${schoolCount} ${schoolText}`;
  
  // Debug logging to see if function is being called
  console.log('formatRouteDisplayName called:', {
    originalName: route.name,
    baseName,
    schoolCount,
    schoolsArray: route.schools,
    result
  });
  
  return result;
}

/**
 * Get route name with driver info and school count
 */
export function formatRouteWithDriver(route: RouteWithSchools): string {
  if (!route) return 'Unknown Route';
  
  const schoolCount = route.schools?.length || 0;
  const schoolText = schoolCount === 1 ? 'School' : 'Schools';
  
  // If route name already contains driver name, just update school count
  if (route.name.includes(route.driverFirstName || '') || route.name.includes(route.driverLastName || '')) {
    const baseName = route.name.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
    return `${baseName} - ${schoolCount} ${schoolText}`;
  }
  
  // If driver info is available but not in route name, add it
  if (route.driverFirstName && route.driverLastName) {
    return `${route.driverFirstName} ${route.driverLastName} Route - ${schoolCount} ${schoolText}`;
  }
  
  // Fallback to just route name with school count
  const baseName = route.name.replace(/\s*-\s*\d+\s+(Schools?|schools?)\s*$/i, '');
  return `${baseName} - ${schoolCount} ${schoolText}`;
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