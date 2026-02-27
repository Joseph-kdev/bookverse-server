import app from "./src/index";

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
