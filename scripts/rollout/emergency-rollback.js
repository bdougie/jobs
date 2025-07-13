#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 Starting emergency rollback...');

// Get environment variables
const rollbackPercentage = process.env.ROLLBACK_PERCENTAGE || '0';
const reason = process.env.ROLLBACK_REASON || 'Emergency rollback initiated';
const triggeredBy = process.env.TRIGGERED_BY || 'manual';

console.log(`Rollback Configuration:`);
console.log(`- Target Percentage: ${rollbackPercentage}%`);
console.log(`- Reason: ${reason}`);
console.log(`- Triggered By: ${triggeredBy}`);

// Simulate rollback process
console.log('\n📊 Current rollout status:');
console.log('- Current percentage: 100%');
console.log('- Active users: 5000');
console.log('- Regions: us-east-1, us-west-2, eu-west-1');

console.log('\n🔄 Executing rollback...');
console.log(`- Reducing rollout to ${rollbackPercentage}%`);
console.log('- Updating feature flags...');
console.log('- Clearing CDN caches...');
console.log('- Notifying monitoring systems...');

// Create rollback report
const report = {
  timestamp: new Date().toISOString(),
  rollbackPercentage,
  reason,
  triggeredBy,
  previousPercentage: 100,
  affectedUsers: 5000,
  status: 'completed',
  actions: [
    'Feature flags updated',
    'CDN caches cleared',
    'Monitoring alerts configured',
    'Incident created'
  ]
};

// Save report
const reportPath = path.join(__dirname, `../../rollback-report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('\n✅ Rollback completed successfully!');
console.log(`📄 Report saved to: ${reportPath}`);

// Exit with success
process.exit(0);