# DashGenAI

An AI-powered platform that automatically generates custom MongoDB dashboards. Simply provide your database connection details, and let AI create a fully functional, customizable dashboard that you can iterate on through natural language commands.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## 🚀 Features

- **AI-Powered Dashboard Generation**: Automatically analyze MongoDB databases and generate custom dashboards
- **Natural Language Iterations**: Modify and enhance your dashboard using simple chat commands
- **Daytona Integration**: Cloud-hosted development environments for each dashboard
- **Real-time Updates**: See changes applied instantly through live preview
- **Collaboration**: Invite team members to view and interact with your dashboards
- **Multiple LLM Support**: Works with OpenAI GPT-4 and Anthropic Claude
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MongoDB** (v6.0 or higher)
- **Git**

You'll also need accounts and API keys for:

- [OpenAI](https://platform.openai.com/) or [Anthropic](https://www.anthropic.com/)
- [Daytona](https://www.daytona.io/) for cloud sandbox environments
- [Postmark](https://postmarkapp.com/) for email notifications (optional)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dashgenai.git
cd dashgenai
```

### 2. Install Dependencies

Install dependencies for all workspaces (client, server, and shared):

```bash
npm install
```

This will install dependencies for the root project, client, server, and shared modules.

### 3. Environment Configuration

#### Server Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
# Server Configuration
PORT=3000

# Database Configuration
DATABASE_URL=mongodb://localhost/DashGenAI

# JWT Configuration
# Generate secure secrets using: openssl rand -hex 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-change-this-in-production

# LLM Configuration (OpenAI)
OPENAI_API_KEY=your-openai-api-key-here

# LLM Configuration (Anthropic - Alternative)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Daytona Configuration
DAYTONA_API_KEY=your-daytona-api-key-here
DAYTONA_API_URL=https://app.daytona.io/api

# Email Configuration (Postmark - Optional)
POSTMARK_API_KEY=your-postmark-api-key-here
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# AWS S3 Configuration (Optional - for project storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=dashgenai-projects
```

#### Client Environment Variables

The client uses Vite and reads environment variables from the server proxy. No additional `.env` file is required for the client.

### 4. Database Setup

Start your MongoDB instance:

```bash
# If using local MongoDB
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

The application will automatically create the necessary collections on first run.

## 🚀 Running the Application

### Development Mode

Run both client and server concurrently:

```bash
npm run start
```

This will start:
- **Client** (Vite dev server) on `http://localhost:5173`
- **Server** (Express with tsx watch) on `http://localhost:3000`

### Run Client Only

```bash
npm run client
```

### Run Server Only

```bash
npm run server
```

### Production Build

Build all workspaces:

```bash
npm run build
```

Run the production build:

```bash
cd server
npm run start:prod
```

## 📁 Project Structure

```
dashgenai/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
│   └── package.json
├── server/                 # Express backend
│   ├── config/            # Configuration files
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── scripts/           # Utility scripts
│   ├── templates/         # Project templates
│   ├── utils/             # Helper functions
│   └── package.json
├── shared/                 # Shared types and configs
│   ├── config/            # Shared configuration
│   ├── types/             # TypeScript types
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 🧪 Testing

### Seed Test Data

Populate the database with test projects:

```bash
cd server
npm run seed
```

### Analyze a Database

Test the database analysis feature:

```bash
cd server
npm run analyze-db -- mongodb://localhost:27017/your-database
```

### Test Template Rendering

Test the template rendering service:

```bash
cd server
npm run test-template
```

## 🔧 Development Tools

### Linting

Lint all workspaces:

```bash
npm run lint
```

Lint and fix issues:

```bash
npm run lint:fix
```

### Type Checking

Run TypeScript type checking:

```bash
# Client
cd client && npm run type-check

# Server
cd server && npm run type-check

# Shared
cd shared && npm run type-check
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Project Endpoints

- `GET /api/projects` - Get all user projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/deploy` - Deploy project to Daytona
- `GET /api/projects/:id/logs` - Stream project logs

### Codex Endpoints

- `POST /api/codex/analyze` - Analyze database structure
- `GET /api/codex/documentation/:projectId` - Get database documentation
- `DELETE /api/codex/documentation/:projectId` - Delete documentation

## 🔐 Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong JWT secrets** - Generate using `openssl rand -hex 32`
3. **Enable CORS properly** - Configure allowed origins in production
4. **Use HTTPS in production** - Never send credentials over HTTP
5. **Rotate API keys regularly** - Especially for production environments
6. **Validate user input** - All inputs are validated on the server
7. **Rate limiting** - Consider adding rate limiting for production

## 🌐 Deployment

### Deploy to Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**:
   - Update `NODE_ENV=production` (if used)
   - Use production database URLs
   - Configure production domains

3. **Use a process manager** (PM2 recommended):
   ```bash
   npm install -g pm2
   cd server
   pm2 start dist/server.js --name dashgenai
   ```

4. **Set up reverse proxy** (nginx recommended):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5173;
       }

       location /api {
           proxy_pass http://localhost:3000;
       }
   }
   ```

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# Check connection string format
mongodb://[username:password@]host[:port]/[database]
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
rm -rf server/node_modules server/package-lock.json
rm -rf shared/node_modules shared/package-lock.json
npm install
```

### TypeScript Errors

```bash
# Rebuild shared module
cd shared
npm run build

# Clear TypeScript cache
rm -rf client/node_modules/.cache
rm -rf server/node_modules/.cache
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows the existing style (use `npm run lint`)
- All tests pass
- TypeScript compilation succeeds
- Documentation is updated

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Pythagora Team** - [Pythagora](https://pythagora.ai)

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for GPT models
- [Anthropic](https://www.anthropic.com/) for Claude models
- [Daytona](https://www.daytona.io/) for cloud development environments
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives

## 📧 Support

For support and questions:

- 📧 Email: support@pythagora.ai
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/dashgenai/issues)
- 📖 Documentation: [Full Documentation](https://docs.pythagora.ai)

## 🗺️ Roadmap

- [ ] Support for PostgreSQL and MySQL databases
- [ ] Advanced dashboard customization options
- [ ] Dashboard templates library
- [ ] Real-time collaboration features
- [ ] Export dashboard as standalone application
- [ ] Plugin system for custom integrations
- [ ] Mobile app for dashboard viewing

---

**Made with ❤️ by Pythagora**
