# Progressive Capture Jobs

This repository contains GitHub Actions workflows for the contributor.info progressive data capture system. It implements the hybrid approach that combines Inngest (for real-time, recent data) with GitHub Actions (for historical, bulk data processing).

## Architecture

The hybrid progressive capture system routes jobs based on data characteristics:

- **Inngest**: Handles recent data (< 24 hours) for real-time user experience
- **GitHub Actions**: Handles historical data (> 24 hours) for cost-effective bulk processing

## Workflows

### Individual Capture Workflows

1. **`capture-pr-details.yml`** - Captures PR details and file changes
2. **`capture-pr-reviews.yml`** - Captures PR reviews and review comments
3. **`capture-pr-comments.yml`** - Captures PR issue comments
4. **`historical-pr-sync.yml`** - Bulk historical PR synchronization

### Orchestration Workflows

1. **`bulk-capture.yml`** - Orchestrates multiple capture types in parallel

## Usage

### Manual Workflow Dispatch

All workflows can be triggered manually through the GitHub Actions UI with the following inputs:

- `repository_id`: Supabase repository ID
- `repository_name`: Repository name in format `owner/repo`
- `pr_numbers`: Comma-separated PR numbers (for specific PRs)
- `time_range`: Time range in days (default: 30)
- `max_items`: Maximum items to process (default: 100-1000)

### Programmatic Dispatch

The workflows are designed to be triggered by the contributor.info frontend via the GitHub Actions API:

```typescript
await octokit.actions.createWorkflowDispatch({
  owner: 'bdougie',
  repo: 'jobs',
  workflow_id: 'capture-pr-details.yml',
  ref: 'main',
  inputs: {
    repository_id: 'uuid-here',
    repository_name: 'owner/repo',
    pr_numbers: '123,456,789'
  }
});
```

## Environment Variables

The workflows expect the following secrets to be configured:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `CONTRIBUTOR_APP_PRIVATE_KEY`: GitHub App private key

And the following variables:

- `CONTRIBUTOR_APP_ID`: GitHub App ID

## Scripts Location

The actual capture scripts are located in the main `bdougie/contributor.info` repository under `scripts/progressive-capture/`. The workflows checkout this repository and execute the appropriate scripts.

**Note**: Scripts have been moved to the main repository to avoid dependency duplication and use the main project's packages.

## Monitoring

- **Logs**: All workflows upload logs as artifacts for debugging
- **Timeouts**: Workflows have appropriate timeouts (30-120 minutes)
- **Parallel Processing**: Bulk capture supports parallel execution with matrix strategy

## Cost Optimization

This approach provides significant cost savings:

- **Inngest**: Reduced to ~$8-40/month (only recent data)
- **GitHub Actions**: $0-24/month (historical data within free tier)
- **Total savings**: 60-85% reduction from previous costs

## Operations

This repository is currently operational and actively processing data capture jobs. The system has been deployed and is handling both real-time and historical data processing through the hybrid architecture.

### Current Operations Status
- **Workflows**: All capture workflows are deployed and functional
- **Monitoring**: Active monitoring through GitHub Actions logs and artifacts
- **Processing**: Handling both manual and programmatic workflow dispatches
- **Cost**: Operating within projected cost savings targets

### Operational Monitoring
- **Logs**: Comprehensive logging through workflow artifacts
- **Performance**: Rate limit tracking and API efficiency monitoring
- **Reliability**: Timeout controls and error handling in place
- **Scalability**: Matrix-based parallel processing for bulk operations