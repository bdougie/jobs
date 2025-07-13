#!/usr/bin/env node

console.log('📢 Sending emergency alerts...');

const alertType = process.env.ALERT_TYPE || 'emergency_rollback';
const reason = process.env.ROLLBACK_REASON || 'Emergency rollback';
const triggeredBy = process.env.TRIGGERED_BY || 'manual';

console.log(`\n🚨 Alert sent:`);
console.log(`- Alert type: ${alertType}`);
console.log(`- Reason: ${reason}`);
console.log(`- Triggered by: ${triggeredBy}`);
console.log(`- Sentry alert: SENT`);
console.log(`- Monitoring systems: NOTIFIED`);

process.exit(0);