# Hybrid Progressive Capture Implementation Plan

## Executive Summary

This document outlines the implementation of a hybrid progressive data capture system that combines the strengths of both Inngest and GitHub Actions:

- **Inngest** handles recent data (< 24 hours) for real-time user experience
- **GitHub Actions** handles historical data (> 24 hours) for cost-effective bulk processing

This approach optimizes for both user experience and operational costs while maintaining all current functionality.

## Architecture Overview

### Current Problem
The current Inngest-only approach has rate limiting issues when processing large amounts of historical data, leading to expensive scaling costs and potential API limits.

### Hybrid Solution

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Trigger                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Hybrid Queue Manager                          │
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │ Time-based      │              │ Workload-based      │   │
│  │ Routing Logic   │              │ Optimization        │   │
│  └─────────────────┘              └─────────────────────┘   │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────┐              ┌─────────────────────┐
│   Inngest Queue     │              │  GitHub Actions     │
│                     │              │     Workflows       │
│ • Recent data       │              │                     │
│ • < 24 hours        │              │ • Historical data   │
│ • Real-time         │              │ • > 24 hours        │
│ • User-triggered    │              │ • Bulk processing   │
│ • Rate limited      │              │ • Scheduled runs    │
└─────────────────────┘              └─────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                       │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: GitHub Actions Infrastructure (Week 1) ✅ COMPLETED

#### 1.1 Create Jobs Repository ✅ COMPLETED
- [x] Create `bdougie/jobs` repository
- [x] Set up comprehensive GitHub Actions workflows with 7 production-ready workflows
- [x] Configure repository secrets for Supabase access

#### 1.2 CLI Scripts for Historical Processing ✅ COMPLETED
- [x] Create `/scripts/progressive-capture/` directory in main repo
- [x] Implement base CLI script classes optimized for bulk processing
- [x] Add historical data processing scripts:
  - [x] `historical-pr-sync.js` - Process PRs older than 24 hours
  - [x] `historical-pr-sync-graphql.js` - GraphQL-optimized version
  - [x] `capture-pr-reviews.js` - Process reviews in bulk
  - [x] `capture-pr-comments.js` - Process comments in bulk
  - [x] `capture-pr-details.js` - Process PR details and file changes
  - [x] `capture-pr-details-graphql.js` - GraphQL-optimized version

#### 1.3 Database Schema Updates ✅ COMPLETED
```sql
-- Add hybrid tracking table
CREATE TABLE progressive_capture_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(50) NOT NULL,
  repository_id UUID REFERENCES repositories(id),
  processor_type VARCHAR(20) NOT NULL, -- 'inngest' or 'github_actions'
  status VARCHAR(20) DEFAULT 'pending',
  time_range_days INTEGER,
  workflow_run_id BIGINT, -- For GitHub Actions jobs
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_capture_jobs_processor ON progressive_capture_jobs(processor_type, status, created_at);
CREATE INDEX idx_capture_jobs_repository ON progressive_capture_jobs(repository_id, created_at);
```

### Phase 2: Hybrid Queue Manager (Week 2) ✅ COMPLETED

#### 2.1 Hybrid Queue Manager Implementation ✅ COMPLETED
```typescript
// src/lib/progressive-capture/hybrid-queue-manager.ts
export class HybridQueueManager {
  private inngestManager: InngestQueueManager;
  private actionsManager: GitHubActionsQueueManager;
  
  constructor() {
    this.inngestManager = new InngestQueueManager();
    this.actionsManager = new GitHubActionsQueueManager();
  }

  async queueJob(jobType: string, data: JobData): Promise<void> {
    const cutoffHours = 24;
    const isRecentData = this.isRecentDataJob(data, cutoffHours);
    
    // Route based on data recency and job characteristics
    if (isRecentData) {
      // Use Inngest for recent, real-time data
      await this.queueWithInngest(jobType, data);
    } else {
      // Use GitHub Actions for historical, bulk data
      await this.queueWithGitHubActions(jobType, data);
    }
  }

  private isRecentDataJob(data: JobData, cutoffHours: number): boolean {
    // Recent PRs (last 24 hours)
    if (data.timeRange && data.timeRange <= 1) return true;
    
    // Specific recent PR numbers
    if (data.prNumbers && data.prNumbers.length <= 10) return true;
    
    // Manual user-triggered jobs (typically for recent data)
    if (data.triggerSource === 'manual') return true;
    
    return false;
  }

  private async queueWithInngest(jobType: string, data: JobData): Promise<void> {
    // Track job in database
    await this.trackJob(jobType, data, 'inngest');
    
    // Use existing Inngest queue manager
    return this.inngestManager.queueJob(jobType, {
      ...data,
      // Ensure rate limiting for Inngest jobs
      maxItems: Math.min(data.maxItems || 50, 50)
    });
  }

  private async queueWithGitHubActions(jobType: string, data: JobData): Promise<void> {
    // Track job in database
    const job = await this.trackJob(jobType, data, 'github_actions');
    
    // Use GitHub Actions for bulk processing
    return this.actionsManager.dispatchWorkflow({
      workflow: this.mapJobTypeToWorkflow(jobType),
      inputs: {
        repository_id: data.repositoryId,
        repository_name: data.repositoryName,
        time_range: data.timeRange?.toString() || '30',
        max_items: data.maxItems?.toString() || '1000',
        job_id: job.id
      }
    });
  }
}
```

#### 2.2 Routing Logic Optimization ✅ COMPLETED
- [x] Implement smart routing based on:
  - **Time range**: < 24 hours → Inngest, > 24 hours → GitHub Actions
  - **Data volume**: < 50 items → Inngest, > 50 items → GitHub Actions  
  - **User context**: Manual triggers → Inngest, Scheduled → GitHub Actions
  - **Repository size**: Small repos → Inngest, Large repos → GitHub Actions

#### 2.3 Update Existing Queue Integration ✅ COMPLETED
- [x] Update `manual-trigger.ts` to use hybrid manager
- [x] Update `bootstrap-queue.ts` to route appropriately
- [x] Maintain backward compatibility with existing API

### Phase 3: GitHub Actions Workflows (Week 2-3) ✅ COMPLETED

#### 3.1 Historical Data Processing Workflows ✅ COMPLETED
- [x] `capture-pr-details.yml` - Individual PR details capture
- [x] `capture-pr-details-graphql.yml` - GraphQL-optimized version
- [x] `capture-pr-reviews.yml` - PR reviews capture
- [x] `capture-pr-comments.yml` - PR comments capture
- [x] `historical-pr-sync.yml` - Bulk historical PR sync
- [x] `historical-pr-sync-graphql.yml` - GraphQL-optimized bulk sync
- [x] `bulk-capture.yml` - Orchestrated parallel processing
```yaml
# .github/workflows/historical-pr-sync.yml
name: Historical PR Sync
on:
  workflow_dispatch:
    inputs:
      repository_id:
        description: 'Repository ID'
        required: true
      repository_name:
        description: 'Repository name (owner/repo)'
        required: true
      days_back:
        description: 'Days to look back (default: 30)'
        default: '30'
      max_items:
        description: 'Maximum PRs to process'
        default: '1000'

jobs:
  sync-historical-prs:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    
    steps:
      - name: Generate GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ vars.CONTRIBUTOR_APP_ID }}
          private-key: ${{ secrets.CONTRIBUTOR_APP_PRIVATE_KEY }}
          
      - name: Checkout main repository
        uses: actions/checkout@v4
        with:
          repository: contributor-info/contributor.info
          token: ${{ steps.app-token.outputs.token }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: scripts/progressive-capture/package-lock.json
          
      - name: Install dependencies
        run: |
          cd scripts/progressive-capture
          npm ci
          
      - name: Run historical PR sync
        run: |
          cd scripts/progressive-capture
          node historical-pr-sync.js
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          REPOSITORY_ID: ${{ inputs.repository_id }}
          REPOSITORY_NAME: ${{ inputs.repository_name }}
          DAYS_BACK: ${{ inputs.days_back }}
          MAX_ITEMS: ${{ inputs.max_items }}
          JOB_ID: ${{ github.run_id }}
```

#### 3.2 Bulk Processing Optimization ✅ COMPLETED
- [x] Implement chunking for large datasets
- [x] Add progress tracking and resumption logic
- [x] Optimize for GitHub Actions 6-hour time limit
- [x] Add comprehensive error handling and retries
- [x] Matrix strategy for parallel processing
- [x] Artifact collection for debugging and monitoring

### Phase 4: Frontend Integration (Week 3) ✅ COMPLETED

#### 4.1 Update Progressive Capture Components ✅ COMPLETED
- [x] Update UI to show both Inngest and GitHub Actions jobs
- [x] Add routing indicators (Real-time vs Bulk processing)
- [x] Enhance notifications to distinguish job types

#### 4.2 Status Monitoring ✅ COMPLETED
```typescript
// Enhanced queue stats that combine both systems
export interface HybridQueueStats {
  inngest: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  github_actions: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  total: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}
```

#### 4.3 User Experience Enhancements ✅ COMPLETED
- [x] Show "Real-time processing" for recent data jobs
- [x] Show "Bulk processing in background" for historical jobs
- [x] Add estimated completion times based on job type
- [x] Link to GitHub Actions logs for bulk jobs

### Phase 5: Testing & Optimization (Week 3-4) ✅ COMPLETED

#### 5.1 Parallel Testing ✅ COMPLETED
- [x] Run both systems on test repositories
- [x] Compare performance and accuracy
- [x] Validate no data gaps between systems
- [x] Test edge cases and error scenarios

#### 5.2 Performance Optimization ✅ COMPLETED
- [x] **Inngest optimization** for recent data:
  - Reduce concurrency limits for real-time responsiveness
  - Optimize for < 100 items per job
  - Focus on user-triggered scenarios
  
- [x] **GitHub Actions optimization** for historical data:
  - Increase batch sizes for efficiency
  - Implement parallel processing with matrix strategy
  - Optimize for cost-effectiveness

#### 5.3 Cost Analysis & Monitoring ✅ COMPLETED
```
Estimated Monthly Costs:

Inngest (Recent Data Only):
- Volume: ~80% reduction (only 24hr data)
- Cost: $8-40/month (down from $40-200)

GitHub Actions (Historical Data):
- Volume: All historical processing
- Cost: $0-24/month (within free tier)

Total: $8-64/month (vs current $40-200)
Savings: 60-85% cost reduction
```

### Phase 6: Production Deployment (Week 4) ✅ COMPLETED

#### 6.1 Gradual Rollout ✅ COMPLETED
- [x] Deploy hybrid system with feature flag - Rollout system with percentage control
- [x] Start with 10% of repositories - `phase6-implementation.js` ready
- [x] Monitor performance and error rates - `monitor-phase6.js` with auto-rollback
- [x] Gradually increase to 100% - Progressive rollout plan documented

#### 6.2 Monitoring & Alerting ✅ COMPLETED
- [x] Set up monitoring for both systems - Health checks every 15 minutes
- [x] Create dashboards showing hybrid performance - `rollout-dashboard.js` interactive CLI
- [x] Alert on job failures or performance degradation - Auto-rollback at 5% error rate
- [x] Track cost optimization metrics - Cost analysis integrated

#### 6.3 Documentation Updates ✅ COMPLETED
- [x] Update `CLAUDE.md` with hybrid architecture - Updated with hybrid commands
- [x] Create operational runbook for hybrid system - `/scripts/rollout/README.md`
- [x] Update developer documentation - Comprehensive docs in `/docs/`
- [x] Create troubleshooting guide - Emergency procedures documented

## Operational Considerations

### Job Routing Decision Matrix

| Data Characteristics | Processor | Reasoning |
|---------------------|-----------|-----------|
| < 24 hours old | Inngest | Real-time user experience |
| > 24 hours old | GitHub Actions | Cost-effective bulk processing |
| < 50 items | Inngest | Fast response for small datasets |
| > 100 items | GitHub Actions | Efficient for large datasets |
| User-triggered | Inngest | Immediate feedback expected |
| Scheduled/Background | GitHub Actions | No urgency, optimize for cost |
| Small repository | Inngest | Low volume, keep simple |
| Large repository | GitHub Actions | High volume, needs optimization |

### Monitoring Strategy

#### Real-time Metrics (Inngest)
- Job completion time (target: < 2 minutes)
- Success rate (target: > 99%)
- Rate limit incidents (target: 0)
- User satisfaction (immediate feedback)

#### Bulk Processing Metrics (GitHub Actions)
- Cost efficiency ($/item processed)
- Throughput (items/hour)
- Resource utilization
- Data completeness

### Fallback Strategy

#### Primary System Failures
- **Inngest down**: Route recent jobs to GitHub Actions with priority flag
- **GitHub Actions down**: Queue historical jobs for later processing
- **Both systems down**: Store jobs in database queue for manual processing

#### Data Consistency
- Implement overlap checking between systems
- Add data validation and gap detection
- Automated reconciliation for edge cases

## Migration from Current State

### Phase A: Non-Breaking Addition (Week 1-2)
1. Add GitHub Actions infrastructure
2. Implement hybrid queue manager alongside existing Inngest
3. Test GitHub Actions with non-critical historical data

### Phase B: Gradual Transition (Week 3)
1. Route 50% of historical jobs to GitHub Actions
2. Monitor performance and costs
3. Adjust routing logic based on results

### Phase C: Full Hybrid Operation (Week 4)
1. Enable full hybrid routing
2. Optimize Inngest for recent data only
3. Remove historical processing from Inngest functions

## Success Metrics

### Performance Targets
- **User Experience**: No degradation for recent data processing
- **Cost Reduction**: 60-85% reduction in total processing costs
- **Scalability**: Handle 10x more historical data without cost increase
- **Reliability**: 99.5% success rate across both systems

### Key Performance Indicators
- Average response time for recent data: < 2 minutes
- Cost per item processed: < $0.001
- Historical data processing capacity: > 10,000 items/day
- User satisfaction: No complaints about slow recent data

## Risk Mitigation

### Technical Risks
- **Complexity**: Maintain simple, clear routing logic
- **Data Gaps**: Implement comprehensive monitoring and validation
- **Vendor Lock-in**: Use open standards and maintain portability

### Operational Risks
- **Learning Curve**: Comprehensive documentation and training
- **Maintenance**: Automated monitoring and alerting
- **Scaling**: Design for 10x growth from day one

## Future Improvements

### 1. GraphQL Migration ✅ COMPLETED
**Status**: Fully implemented with both REST and GraphQL versions

Successfully migrated to GitHub's GraphQL API with significant efficiency gains:
- **2-5x fewer API calls**: 1 GraphQL query vs 5 REST calls per PR
- **Higher secondary limits**: 2,000 points/minute (GraphQL) vs 900 points/minute (REST)
- **Better timeout resilience**: Single atomic request vs multiple calls
- **Smarter rate limit usage**: Points based on complexity, not request count
- **Hybrid fallback system**: Automatic REST fallback when GraphQL fails
- **Advanced rate limiting**: Intelligent rate limit monitoring and management

**Impact**: Allows processing 2-5x more data within same rate limits, making both Inngest and GitHub Actions more efficient.

### 2. Timeout Optimizations (COMPLETED ✅)
**Status**: Documented in `/docs/inngest-timeout-optimizations.md`

Successfully resolved 30-second timeout issues in Inngest functions:
- Added aggressive timeouts to all operations (15s API, 10s DB)
- Removed unnecessary rate limit checking
- Optimized database operations with upserts
- Streamlined function steps
- **Result**: 95%+ success rate, 8-15 second average duration

### 3. Advanced Batch Processing
- Implement GraphQL batch queries for multiple PRs
- Use GitHub's batch endpoints where available
- Smart batching based on repository activity and size
- **Note**: GraphQL migration would enable more efficient batching

### 4. Intelligent Caching Strategy
- Cache repository metadata and contributor data
- Use Supabase as a smart cache layer
- Implement TTL-based cache invalidation
- Cache GraphQL query results for repeated requests

### 5. Performance Monitoring & Analytics ⚠️ PARTIALLY COMPLETED
**Status**: Basic monitoring implemented, advanced analytics needed

**Completed**:
- Real-time rate limit tracking in scripts
- Performance metrics in GitHub Actions logs
- Basic error tracking and logging
- Cost analysis framework

**Still Needed**:
- Centralized monitoring dashboard
- Automated optimization recommendations
- Cross-system performance comparison
- Alerting for anomalies and failures

## Outstanding Implementation Tasks

### 🔄 High Priority

#### 1. Production Testing & Validation
- [ ] **End-to-end testing** on production repositories
- [ ] **Performance benchmarking** vs current Inngest system
- [ ] **Data integrity validation** between systems
- [ ] **Load testing** with high-volume repositories
- [ ] **Error scenario testing** (network failures, timeouts, etc.)

#### 2. Advanced Monitoring & Observability
- [ ] **Centralized dashboard** combining GitHub Actions + Inngest metrics
- [ ] **Real-time alerting** for job failures and performance degradation
- [ ] **Cost tracking** per repository and processing type
- [ ] **SLA monitoring** for response times and success rates
- [ ] **Automated reporting** for weekly/monthly system health

#### 3. Intelligent Caching System
- [ ] **Repository metadata caching** (contributors, labels, etc.)
- [ ] **GraphQL query result caching** for repeated requests
- [ ] **Smart cache invalidation** based on GitHub webhooks
- [ ] **Cross-job data sharing** to reduce redundant API calls
- [ ] **Cache performance metrics** and optimization

### 🔧 Medium Priority

#### 4. Production Hardening
- [ ] **Circuit breaker patterns** for external API calls
- [ ] **Exponential backoff** for rate limit recovery
- [ ] **Dead letter queues** for failed jobs
- [ ] **Graceful degradation** when services are unavailable
- [ ] **Resource usage optimization** (memory, CPU, network)

#### 5. Advanced Analytics
- [ ] **Processing efficiency analysis** (items/second, cost/item)
- [ ] **Repository profiling** for optimal routing decisions
- [ ] **Predictive scaling** based on historical patterns
- [ ] **Anomaly detection** for unusual processing patterns
- [ ] **Recommendation engine** for system optimizations

### 📊 Nice to Have

#### 6. Enhanced User Experience
- [ ] **Real-time progress tracking** for long-running jobs
- [ ] **Estimated completion times** based on historical data
- [ ] **Interactive debugging** tools for failed jobs
- [ ] **Performance insights** dashboard for users
- [ ] **Customizable processing preferences** per repository

#### 7. Advanced Features
- [ ] **Incremental processing** for large repositories
- [ ] **Smart conflict resolution** for concurrent jobs
- [ ] **Multi-tenant job isolation** for enterprise use
- [ ] **API rate limit pooling** across multiple tokens
- [ ] **Webhook-driven processing** for real-time updates

## Conclusion

The hybrid approach leverages the strengths of both systems:
- **Inngest** provides excellent real-time user experience for recent data
- **GitHub Actions** offers cost-effective, scalable processing for historical data

This architecture optimizes for both user satisfaction and operational efficiency, providing a sustainable long-term solution that can scale with the application's growth.

Key benefits:
- 60-85% cost reduction
- Maintained user experience quality
- Improved scalability for historical processing
- Better operational visibility and control
- Reduced vendor dependency risk

The implementation can be done incrementally with minimal risk, allowing for continuous optimization and improvement based on real-world performance data.