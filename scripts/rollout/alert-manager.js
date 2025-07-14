#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📢 Alert Manager - Creating GitHub Issue...');

const alertType = process.env.ALERT_TYPE || 'emergency_rollback';
const reason = process.env.ROLLBACK_REASON || 'Emergency rollback';
const triggeredBy = process.env.TRIGGERED_BY || 'manual';
const metricsType = process.env.METRICS_TYPE || 'alert';

// Function to find the most recent metrics file
function findLatestMetricsFile() {
  try {
    const files = fs.readdirSync(path.join(__dirname, '../..'))
      .filter(f => f.startsWith('rollout-metrics-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(__dirname, '../..', f),
        mtime: fs.statSync(path.join(__dirname, '../..', f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    console.error('Error finding metrics file:', error.message);
    return null;
  }
}

// Function to create GitHub issue
async function createGitHubIssue() {
  try {
    let metricsData = null;
    const metricsFile = findLatestMetricsFile();
    
    if (metricsFile) {
      try {
        metricsData = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        console.log(`📊 Found metrics file: ${path.basename(metricsFile)}`);
      } catch (error) {
        console.error('Error reading metrics file:', error.message);
      }
    }

    // Prepare issue title and body
    const timestamp = new Date().toISOString();
    let title = `🚨 Rollout Alert: ${alertType}`;
    let body = `## Rollout Alert Details\n\n`;
    body += `**Alert Type:** ${alertType}\n`;
    body += `**Reason:** ${reason}\n`;
    body += `**Triggered By:** ${triggeredBy}\n`;
    body += `**Timestamp:** ${timestamp}\n`;
    body += `**Environment:** ${process.env.ENVIRONMENT || 'production'}\n\n`;

    // Add metrics data if available
    if (metricsData) {
      title = `🚨 Rollout Alert: ${metricsData.errorRate === 100 ? '100% Error Rate Detected' : alertType}`;
      body += `### Metrics Summary\n\n`;
      body += `- **Total Jobs:** ${metricsData.totalJobs || 'N/A'}\n`;
      body += `- **Success Rate:** ${metricsData.successRate || 'N/A'}%\n`;
      body += `- **Error Rate:** ${metricsData.errorRate || 'N/A'}%\n`;
      body += `- **Health Score:** ${metricsData.healthScore || 'N/A'}/100\n`;
      body += `- **Cost Savings:** ${metricsData.costSavings || 'N/A'}%\n\n`;
      
      if (metricsData.recommendations && metricsData.recommendations.length > 0) {
        body += `### Recommendations\n\n`;
        metricsData.recommendations.forEach(rec => {
          body += `- ${rec}\n`;
        });
        body += '\n';
      }
    }

    body += `### Action Required\n\n`;
    body += `Please investigate the rollout issues immediately. `;
    
    if (metricsData && metricsData.errorRate === 100) {
      body += `The 100% error rate indicates a critical failure in the rollout system.\n\n`;
      body += `**Immediate steps:**\n`;
      body += `1. Check the rollout configuration and database connectivity\n`;
      body += `2. Review recent changes to the rollout system\n`;
      body += `3. Verify the worker/processor implementations\n`;
      body += `4. Consider emergency rollback if necessary\n`;
    }

    // Add labels
    const labels = ['rollout-alert', 'automated'];
    if (metricsData && metricsData.errorRate === 100) {
      labels.push('critical', 'high-priority');
    }
    if (alertType === 'emergency_rollback') {
      labels.push('emergency');
    }

    // Create issue using gh CLI
    const labelString = labels.join(',');
    const issueCommand = `gh issue create --title "${title}" --body "${body}" --label "${labelString}"`;
    
    console.log('\n📝 Creating GitHub issue...');
    const output = execSync(issueCommand, { encoding: 'utf8' });
    console.log('✅ GitHub issue created successfully!');
    console.log(output.trim());

    // Log summary
    console.log(`\n📊 Alert Summary:`);
    console.log(`- Alert type: ${alertType}`);
    console.log(`- Reason: ${reason}`);
    console.log(`- Triggered by: ${triggeredBy}`);
    console.log(`- GitHub issue: CREATED`);
    if (metricsData) {
      console.log(`- Error rate: ${metricsData.errorRate}%`);
      console.log(`- Success rate: ${metricsData.successRate}%`);
    }

  } catch (error) {
    console.error('❌ Failed to create GitHub issue:', error.message);
    console.error('Please ensure gh CLI is installed and authenticated');
    process.exit(1);
  }
}

// Run the alert manager
createGitHubIssue().then(() => {
  console.log('\n✅ Alert manager completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Alert manager failed:', error);
  process.exit(1);
});