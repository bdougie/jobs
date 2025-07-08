# Deployment Guide for Hybrid Progressive Capture

This guide covers the deployment steps for implementing the hybrid progressive capture system using the `bdougie/jobs` repository.

## Prerequisites

1. **GitHub App**: A GitHub App with the following permissions:
   - Repository permissions: Read access to Issues, Pull requests, Repository contents
   - Account permissions: Read access to User email addresses

2. **Supabase Database**: Access to the contributor.info Supabase instance

3. **Repository Access**: Write access to both `bdougie/jobs` and `bdougie/contributor.info` repositories

## Step 1: Copy Scripts to Main Repository

The progressive capture scripts need to be copied from this jobs repository to the main `bdougie/contributor.info` repository:

```bash
# In the contributor.info repository
mkdir -p scripts/progressive-capture/lib

# Copy the scripts
cp /path/to/jobs/scripts/progressive-capture/* scripts/progressive-capture/
cp /path/to/jobs/scripts/progressive-capture/lib/* scripts/progressive-capture/lib/
```

## Step 2: Install Dependencies

In the `bdougie/contributor.info` repository:

```bash
cd scripts/progressive-capture
npm install
```

## Step 3: Configure GitHub Repository Secrets

In the `bdougie/jobs` repository settings, add the following secrets:

### Repository Secrets
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key (not anon key)
- `CONTRIBUTOR_APP_PRIVATE_KEY`: The private key for your GitHub App

### Repository Variables
- `CONTRIBUTOR_APP_ID`: The App ID of your GitHub App

## Step 4: Database Schema Updates

Apply the following migration to your Supabase database:

```sql
-- Add hybrid tracking table
CREATE TABLE IF NOT EXISTS progressive_capture_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(50) NOT NULL,
  repository_id UUID REFERENCES repositories(id),
  processor_type VARCHAR(20) NOT NULL DEFAULT 'github_actions', -- 'inngest' or 'github_actions'
  status VARCHAR(20) DEFAULT 'pending',
  time_range_days INTEGER,
  workflow_run_id BIGINT, -- For GitHub Actions jobs
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capture_jobs_processor 
ON progressive_capture_jobs(processor_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_capture_jobs_repository 
ON progressive_capture_jobs(repository_id, created_at);

-- Progress tracking table
CREATE TABLE IF NOT EXISTS progressive_capture_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES progressive_capture_jobs(id),
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  current_item TEXT,
  errors JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capture_progress_job 
ON progressive_capture_progress(job_id);
```

## Step 5: GitHub App Installation

1. Install your GitHub App on the `bdougie` organization
2. Grant it access to both `jobs` and `contributor.info` repositories
3. Note the App ID for the repository variables

## Step 6: Test Workflow Dispatch

Test the workflows by manually triggering them:

1. Go to the `bdougie/jobs` repository
2. Click on "Actions" tab
3. Select a workflow (e.g., "Capture PR Details")
4. Click "Run workflow"
5. Fill in the required inputs:
   - `repository_id`: A valid repository UUID from your database
   - `repository_name`: Format like `bdougie/contributor.info`
   - `pr_numbers`: Comma-separated PR numbers to test

## Step 7: Frontend Integration

Update the contributor.info frontend to use the new GitHub Actions client:

```typescript
// In src/lib/progressive-capture/github-actions-client.ts
import { Octokit } from '@octokit/rest';

export class GitHubActionsClient {
  private octokit: Octokit;
  private owner = 'bdougie';
  private repo = 'jobs';

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.VITE_GITHUB_TOKEN
    });
  }

  async dispatchWorkflow(workflow: string, inputs: Record<string, string>) {
    return await this.octokit.rest.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: workflow,
      ref: 'main',
      inputs
    });
  }
}
```

## Step 8: Monitoring Setup

1. **GitHub Actions Monitoring**: Use the native GitHub Actions UI to monitor job execution
2. **Database Monitoring**: Query the `progressive_capture_jobs` table for job status
3. **Error Tracking**: Check the `progressive_capture_progress` table for detailed error information

## Step 9: Gradual Rollout

1. Start with test repositories
2. Monitor performance and error rates
3. Gradually increase the percentage of jobs routed to GitHub Actions
4. Implement the hybrid queue manager for automatic routing

## Troubleshooting

### Common Issues

1. **Authentication Errors**: 
   - Verify GitHub App permissions
   - Check that the private key is correctly formatted
   - Ensure the App is installed on the correct repositories

2. **Database Connection Issues**:
   - Verify Supabase URL and service key
   - Check that the database schema is up to date
   - Ensure RLS policies allow service key access

3. **Script Execution Failures**:
   - Check the GitHub Actions logs for detailed error messages
   - Verify that the scripts directory exists in the main repository
   - Ensure all npm dependencies are installed

### Performance Optimization

1. **Rate Limiting**: The scripts include built-in rate limiting for GitHub API
2. **Parallel Processing**: Use the bulk-capture workflow for processing multiple PRs
3. **Chunking**: For very large datasets, consider breaking them into smaller chunks

## Cost Monitoring

Track GitHub Actions usage:

```bash
# Check current usage
gh api /repos/bdougie/jobs/actions/billing/usage

# Set up usage alerts in GitHub repository settings
```

## Next Steps

1. Implement the hybrid queue manager to automatically route jobs
2. Add GraphQL API support for improved efficiency
3. Set up automated monitoring and alerting
4. Create operational runbooks for common scenarios

## Support

For issues with the deployment:

1. Check the GitHub Actions logs first
2. Review the database tables for error details
3. Consult the implementation documentation
4. Test individual components in isolation