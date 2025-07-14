#!/usr/bin/env node

console.log('🎯 Setting rollout percentage...');

// Get environment variables
const targetPercentage = process.argv[2] || process.env.TARGET_PERCENTAGE || '25';
const reason = process.argv[3] || process.env.REASON || `Setting rollout to ${targetPercentage}%`;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log(`Target percentage: ${targetPercentage}%`);
console.log(`Reason: ${reason}`);

async function setRolloutPercentage() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
  }

  const percentage = parseInt(targetPercentage);
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    console.error('❌ Invalid percentage. Must be between 0 and 100');
    process.exit(1);
  }

  try {
    // Use dynamic import for ES modules
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the current configuration
    const { data: config, error: fetchError } = await supabase
      .from('rollout_configuration')
      .select('*')
      .eq('feature_name', 'hybrid_progressive_capture')
      .eq('is_active', true)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching rollout configuration:', fetchError.message);
      process.exit(1);
    }

    if (!config) {
      console.error('❌ No active rollout configuration found');
      process.exit(1);
    }

    console.log('\n📊 Current rollout configuration:');
    console.log(`- Feature: ${config.feature_name}`);
    console.log(`- Current percentage: ${config.rollout_percentage}%`);
    console.log(`- Strategy: ${config.rollout_strategy}`);
    console.log(`- Emergency stop: ${config.emergency_stop}`);
    console.log(`- Auto rollback: ${config.auto_rollback_enabled}`);

    if (config.emergency_stop) {
      console.error('❌ Cannot update rollout percentage: Emergency stop is active');
      console.log('Please clear emergency stop first before updating rollout percentage');
      process.exit(1);
    }

    const previousPercentage = config.rollout_percentage;

    // Update the rollout percentage
    const { error: updateError } = await supabase
      .from('rollout_configuration')
      .update({
        rollout_percentage: percentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('❌ Error updating rollout percentage:', updateError.message);
      process.exit(1);
    }

    // Log the change in rollout history
    const { error: historyError } = await supabase
      .from('rollout_history')
      .insert({
        rollout_config_id: config.id,
        action: 'updated',
        previous_percentage: previousPercentage,
        new_percentage: percentage,
        reason: reason,
        triggered_by: 'manual',
        metadata: { 
          timestamp: new Date().toISOString(),
          script: 'set-rollout-percentage.js'
        }
      });

    if (historyError) {
      console.error('⚠️  Error logging rollout history:', historyError.message);
    }

    console.log(`\n✅ Successfully updated rollout percentage from ${previousPercentage}% to ${percentage}%`);
    
    // Show impact estimate
    console.log('\n📈 Rollout Impact:');
    if (percentage === 0) {
      console.log('- All repositories will use Inngest-only processing');
    } else if (percentage <= 10) {
      console.log('- Primarily test repositories will use hybrid processing');
    } else if (percentage <= 25) {
      console.log('- Test and small repositories will use hybrid processing');
    } else if (percentage <= 50) {
      console.log('- Test, small, and medium repositories will use hybrid processing');
    } else {
      console.log('- Majority of repositories will use hybrid processing');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Exception setting rollout percentage:', error.message);
    process.exit(1);
  }
}

// Run the script
setRolloutPercentage();