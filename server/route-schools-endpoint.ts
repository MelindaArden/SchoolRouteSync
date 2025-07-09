// API endpoint for route schools - to be added to routes.ts
app.get("/api/route-schools", async (req, res) => {
  try {
    const routeSchools = await db.select().from(routeSchoolsTable);
    res.json(routeSchools);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});