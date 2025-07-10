# ops.contributor.info Dashboard

A real-time monitoring dashboard for the hybrid progressive capture system built with SvelteKit.

## Features

- **Real-time Metrics**: Live monitoring of Inngest and GitHub Actions job queues
- **Alert System**: Automatic alerts for system failures and performance issues
- **Recent Jobs**: View latest job executions with detailed status information
- **Auto-refresh**: Configurable automatic refresh with manual override
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

This dashboard monitors the hybrid progressive capture system:

- **Inngest Queue**: Handles recent data (< 24 hours) for real-time user experience
- **GitHub Actions**: Handles historical data (> 24 hours) for cost-effective bulk processing

## Tech Stack

- **SvelteKit** - Full-stack framework with SSR
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Supabase** - Database and real-time subscriptions
- **Chart.js** - Data visualization (planned)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Access to the Supabase database
- GitHub App credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```bash
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
GITHUB_TOKEN=your_github_token
GITHUB_APP_ID=your_github_app_id
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the dashboard.

### Building for Production

```bash
npm run build
```

The built application will be in the `build/` directory.

## API Endpoints

- `GET /api/metrics` - Overall system metrics
- `GET /api/jobs/recent` - Recent job executions
- `GET /api/costs` - Cost analysis (planned)
- `GET /api/alerts` - Active system alerts (planned)

## Dashboard Pages

- **Overview** (`/`) - Main dashboard with system health
- **Analytics** (`/analytics`) - Historical trends and insights (planned)
- **Settings** (`/settings`) - Dashboard configuration (planned)

## Database Schema

The dashboard expects the following tables in Supabase:

```sql
-- Progressive capture job tracking
CREATE TABLE progressive_capture_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(50) NOT NULL,
  repository_id UUID REFERENCES repositories(id),
  processor_type VARCHAR(20) NOT NULL, -- 'inngest' or 'github_actions'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  time_range_days INTEGER,
  workflow_run_id BIGINT,
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Development Roadmap

### Phase 1: Foundation ✅
- [x] SvelteKit setup with TypeScript
- [x] Basic metrics display
- [x] Real-time updates
- [x] Alert system
- [x] Recent jobs view

### Phase 2: Enhanced Analytics (In Progress)
- [ ] Historical performance charts
- [ ] Cost tracking dashboard
- [ ] Repository-specific insights
- [ ] Performance trend analysis

### Phase 3: Advanced Features (Planned)
- [ ] Server-sent events for real-time updates
- [ ] Custom alert thresholds
- [ ] Data export functionality
- [ ] Advanced filtering and search

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the contributor.info progressive capture system.
