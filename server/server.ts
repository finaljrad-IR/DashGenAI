import dotenv from 'dotenv';
import express from 'express';
import { Request, Response } from 'express';
import basicRoutes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import codexRoutes from './routes/codexRoutes.js';
import { connectDB } from './config/database.js';
import cors from 'cors';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL variables in .env missing.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Pretty-print JSON responses
app.enable('json spaces');
// We want to be consistent with URL paths, so we enable strict routing
app.enable('strict routing');

app.use(cors({}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();

app.on("error", (error: Error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Basic Routes
app.use(basicRoutes);
// Authentication Routes
app.use('/api/auth', authRoutes);
// Project Routes
app.use('/api/projects', projectRoutes);
// Codex Routes
app.use('/api/codex', codexRoutes);

// If no routes handled the request, it's a 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Page not found." });
});

// Error handling
app.use((err: Error, req: Request, res: Response) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: "There was an error serving your request." });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});