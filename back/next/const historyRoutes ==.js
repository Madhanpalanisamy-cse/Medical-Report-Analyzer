const historyRoutes =
require("./routes/history");

const pdfRoutes =
require("./routes/pdfReport");

app.use(
"/api/history",
historyRoutes
);

app.use(
"/api/pdf",
pdfRoutes
);