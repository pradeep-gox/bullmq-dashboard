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

### READ_ONLY

- **Description:** Controls whether the dashboard is in read-only mode (no destructive actions allowed).
- **Type:** boolean ("true" or "false")
- **Default:** `true`
- **Usage:**
  - Set `READ_ONLY=false` to allow write operations (dangerous in production).
  - By default, or if set to any value other than "false", the dashboard is read-only.

Example usage in `.env` file:

```
READ_ONLY=false
```

## API Endpoints

- `GET /`
