#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏥 Rollout Health Checker initialized');

// Get environment variables
const checkType = process.env.CHECK_TYPE || 'full';
const forceCheck = process.env.FORCE_CHECK === 'true';

console.log(`Check type: ${checkType}`);
console.log(`Force check: ${forceCheck}`);

// Simulated rollout percentage (would normally come from database)
const currentRolloutPercentage = 0;

console.log('🔍 Starting rollout health check...');
console.log(`📊 Current rollout: ${currentRolloutPercentage}%`);

// Skip health check if rollout is at 0% (unless forced)
if (currentRolloutPercentage === 0 && !forceCheck) {
  console.log('✅ Rollout at 0% - skipping health check');
  
  // Create minimal health report
  const healthReport = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    rolloutPercentage: currentRolloutPercentage,
    checkType: checkType,
    skipped: true,
    reason: 'Rollout at 0%'
  };
  
  const reportPath = path.join(__dirname, `../../rollout-health-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(healthReport, null, 2));
  
  console.log('\n📊 Health Check Summary:');
  console.log(`Status: ${healthReport.status}`);
  console.log(`Rollout: ${healthReport.rolloutPercentage}%`);
  
  process.exit(0);
}

// Simulate health metrics
const healthMetrics = {
  errorRate: 0.02, // 2% error rate
  responseTime: 245, // ms
  successRate: 0.98,
  activeUsers: Math.floor(currentRolloutPercentage * 50), // 50 users per percentage point
  failedRequests: 15,
  totalRequests: 750
};

// Determine health status
let status = 'healthy';
let issues = [];

if (healthMetrics.errorRate > 0.05) {
  status = 'critical';
  issues.push('Error rate exceeds 5%');
} else if (healthMetrics.errorRate > 0.03) {
  status = 'warning';
  issues.push('Error rate exceeds 3%');
}

if (healthMetrics.responseTime > 500) {
  status = status === 'critical' ? 'critical' : 'warning';
  issues.push('Response time exceeds 500ms');
}

// Create detailed health report
const healthReport = {
  timestamp: new Date().toISOString(),
  status: status,
  rolloutPercentage: currentRolloutPercentage,
  checkType: checkType,
  metrics: healthMetrics,
  issues: issues,
  thresholds: {
    criticalErrorRate: 0.05,
    warningErrorRate: 0.03,
    maxResponseTime: 500
  }
};

// Save report
const reportPath = path.join(__dirname, `../../rollout-health-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(healthReport, null, 2));

console.log('\n📊 Health Check Summary:');
console.log(`Status: ${healthReport.status}`);
console.log(`Rollout: ${healthReport.rolloutPercentage}%`);
console.log(`Error Rate: ${(healthMetrics.errorRate * 100).toFixed(2)}%`);
console.log(`Response Time: ${healthMetrics.responseTime}ms`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues detected:');
  issues.forEach(issue => console.log(`- ${issue}`));
}

// Exit with error if critical
if (status === 'critical') {
  console.log('\n❌ Health check failed: Critical issues detected');
  process.exit(1);
}

console.log('\n✅ Health check completed');
process.exit(0);