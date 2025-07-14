# Rollout Management Scripts

This directory contains scripts for managing the hybrid progressive capture rollout system. These scripts integrate with the rollout configuration stored in the contributor.info database.

## Overview

The rollout system allows gradual deployment of the hybrid progressive capture feature, which routes job processing between Inngest and GitHub Actions based on configurable percentages.

## Scripts

### health-checker.js

Monitors the health of the rollout and reports metrics.

**Features:**
- Fetches current rollout percentage from database
- Simulates health metrics based on rollout percentage
- Creates health reports for monitoring
- Triggers alerts when error thresholds are exceeded

**Usage:**
```bash
# Basic usage (requires Supabase credentials)
SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node scripts/rollout/health-checker.js

# With environment variables
CHECK_TYPE=full FORCE_CHECK=true node scripts/rollout/health-checker.js
```

**Environment Variables:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `CHECK_TYPE`: Type of health check (full, error_rates, metrics_only)
- `FORCE_CHECK`: Force health check even at 0% rollout

### set-rollout-percentage.js

Updates the rollout percentage in the database.

**Features:**
- Validates percentage input (0-100)
- Shows current configuration before update
- Logs changes to rollout history
- Provides impact estimates
- Prevents updates when emergency stop is active

**Usage:**
```bash
# Set rollout to 25%
SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node scripts/rollout/set-rollout-percentage.js 25

# With custom reason
node scripts/rollout/set-rollout-percentage.js 50 "Expanding rollout after successful testing"
```

### emergency-rollback.js

Performs emergency rollback of the rollout percentage.

**Features:**
- Immediately reduces rollout to specified percentage
- Creates rollback reports
- Simulates CDN cache clearing
- Updates monitoring systems

**Usage:**
```bash
# Used by GitHub Actions workflow
ROLLBACK_PERCENTAGE=0 ROLLBACK_REASON="High error rate" node scripts/rollout/emergency-rollback.js
```

### verify-rollback.js

Verifies that a rollback completed successfully.

**Features:**
- Confirms rollback percentage matches expected value
- Creates verification reports
- Used after emergency rollbacks

### alert-manager.js

Sends alerts for rollout events.

**Features:**
- Notifies monitoring systems
- Sends Sentry alerts
- Used for emergency events

## Database Integration

These scripts integrate with the contributor.info database tables:

- `rollout_configuration`: Stores current rollout settings
- `rollout_history`: Audit trail of all changes
- `rollout_metrics`: Performance metrics
- `repository_categories`: Repository classification

## Workflows

The scripts are used by GitHub Actions workflows:

1. **rollout-health-monitor.yml**: Runs health checks every 15 minutes
2. **rollout-emergency-rollback.yml**: Performs emergency rollbacks
3. **rollout-metrics-collector.yml**: Collects rollout metrics

## Setting Rollout Percentage

To set the rollout to 25%, you have two options:

### Option 1: From jobs repository
```bash
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_KEY="your_service_key"
node scripts/rollout/set-rollout-percentage.js 25
```

### Option 2: From contributor.info repository
```bash
cd ../contributor.info
node scripts/update-rollout.js
```

## Monitoring

Health reports are generated with filenames like:
- `rollout-health-{timestamp}.json`
- `rollback-report-{timestamp}.json`
- `verification-{timestamp}.json`

These are uploaded as artifacts in GitHub Actions for analysis.

## Emergency Procedures

If issues arise:

1. **Emergency Stop**: Set `emergency_stop = true` in database
2. **Rollback**: Run emergency rollback workflow
3. **Monitor**: Check health reports and metrics
4. **Resume**: Clear emergency stop and gradually increase percentage

## Rollout Strategies

The system supports multiple strategies:
- **percentage**: Hash-based deterministic selection
- **whitelist**: Explicit repository list
- **repository_size**: Based on repository categories (test → small → medium → large)