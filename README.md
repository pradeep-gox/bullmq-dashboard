# BullMQ Dashboard with Bull Board (Read-Only & Auto-Discovery)

A **read-only** web-based dashboard for monitoring BullMQ queues with **automatic queue discovery**. No manual queue configuration needed!

## Features

- 🔍 **Automatic Queue Discovery** - Finds all BullMQ queues automatically  
- 📊 **Real-time Monitoring** - Live queue status and job updates
- 🔒 **Read-Only Mode** - View-only access, no modifications allowed
- 🔄 **Auto-Refresh** - Automatically discovers new queues every 30 seconds
- 📈 **Queue Statistics** - Job counts, status breakdown, and metrics
- 👀 **Job Inspection** - View job data, progress, and error details
- 🚫 **No Modifications** - Cannot retry, delete, or modify jobs/queues

## Prerequisites

- Node.js (v14 or higher)
- Redis server with existing BullMQ queues
- Your BullMQ applications should be running and creating queues

## Installation

1. **Create the project:**
   ```bash
   mkdir bullmq-dashboard
   cd bullmq-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Redis configuration
   ```

## Usage

1. **Start the dashboard:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

2. **Access the dashboard:**
   - Dashboard: `http://localhost:3000/admin/queues`
   - API Info: `http://localhost:3000`
   - Health Check: `http://localhost:3000/health`
   - Refresh Queues: `http://localhost:3000/refresh`

## How It Works

### Automatic Queue Discovery

The dashboard automatically discovers BullMQ queues by:

1. **Scanning Meta Keys**: Looks for keys matching `bull:*:meta` pattern (most reliable)
2. **Extracting Queue Names**: Parses queue names from meta key structure (`bull:queueName:meta`)
3. **Creating Queue Instances**: Dynamically creates BullMQ Queue objects
4. **Auto-Refresh**: Checks for new queues every 30 seconds
5. **Live Updates**: Immediately shows new queues as they're created

The `:meta` keys are the most reliable way to identify actual BullMQ queues since they contain queue metadata and are always present for active queues.

### Read-Only Features

- ❌ Cannot retry failed jobs
- ❌ Cannot delete jobs or clean queues  
- ❌ Cannot pause/resume queues
- ❌ Cannot modify job data
- ✅ Can view all job details and logs
- ✅ Can see real-time queue statistics
- ✅ Can inspect job progress and errors

## Configuration

### Redis Connection

Update your `.env` file:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password-if-needed
REDIS_DB=0
```

### Queue Discovery Settings

Customize in `.env`:

```bash
# How often to check for new queues (milliseconds)
QUEUE_REFRESH_INTERVAL=30000

# Maximum number of queues to discover
MAX_QUEUES=100
```

## API Endpoints

- `GET /` - Server info and discovered queues
- `GET /health` - Health check with queue count
- `GET /refresh` - Manually refresh queue discovery
- `GET /admin/queues` - Bull Board dashboard (read-only)

## Example Response

```json
{
  "message": "BullMQ Dashboard Server (Read-Only)",
  "dashboard": "http://localhost:3000/admin/queues",
  "queues": ["emailQueue", "imageQueue", "webhookQueue"],
  "totalQueues": 3,
  "mode": "read-only",
  "status": "running"
}
```

## Troubleshooting

### Common Issues

1. **Cannot connect to Redis:**
   - Verify Redis is running: `redis-cli ping`
   - Check Redis configuration in `.env`

2. **Queues not showing:**
   - Ensure queue names match exactly with your BullMQ setup
   - Verify Redis connection and database number

3. **Jobs not appearing:**
   - Make sure your application is using the same Redis instance
   - Check that jobs are being added to the correct queue names

### Debugging

Enable debug logs:
```bash
DEBUG=bull-board:* npm start
```

## Production Deployment

1. **Set environment variables:**
   ```bash
   NODE_ENV=production
   PORT=3000
   REDIS_HOST=your-production-redis-host
   REDIS_PASSWORD=your-redis-password
   ```

2. **Security considerations:**
   - Use authentication/authorization for the dashboard
   - Restrict access to the `/admin/queues` route
   - Use HTTPS in production

3. **Process management:**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name bullmq-dashboard
   ```

## Customization

You can customize the dashboard by:

- Adding authentication middleware
- Customizing the Bull Board UI theme
- Adding additional monitoring endpoints
- Integrating with logging systems

## Dependencies

- `@bull-board/api` - Core Bull Board functionality
- `@bull-board/express` - Express.js adapter
- `@bull-board/ui` - Web UI components
- `bullmq` - BullMQ queue library
- `express` - Web framework
- `ioredis` - Redis client

## License

MIT
