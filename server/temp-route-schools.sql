-- Add route schools endpoint to support enhanced school management
-- This SQL shows the data we need to fetch for route assignments

SELECT 
  rs.id,
  rs.routeId,
  rs.schoolId,
  rs.orderIndex,
  rs.estimatedArrivalTime,
  r.name as routeName,
  s.name as schoolName
FROM route_schools rs
JOIN routes r ON rs.routeId = r.id
JOIN schools s ON rs.schoolId = s.id
ORDER BY rs.routeId, rs.orderIndex;