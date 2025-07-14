import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  console.error('Please set them in your environment or .env file');
  process.exit(1);
}

// Create Supabase client with service key for full access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RolloutConfiguration {
  feature_name: string;
  rollout_percentage: number;
  rollout_strategy: string;
  emergency_stop: boolean;
  is_active: boolean;
  updated_at: string;
}

// Query current rollout configuration
async function queryRollout(featureName: string = 'hybrid_progressive_capture') {
  console.log(`\n📊 Querying rollout configuration for: ${featureName}`);
  
  const { data, error } = await supabase
    .from('rollout_configuration')
    .select('*')
    .eq('feature_name', featureName)
    .single();

  if (error) {
    console.error('❌ Error querying rollout configuration:', error.message);
    return null;
  }

  if (data) {
    console.log('\n✅ Current rollout configuration:');
    console.log(`   Feature: ${data.feature_name}`);
    console.log(`   Percentage: ${data.rollout_percentage}%`);
    console.log(`   Strategy: ${data.rollout_strategy}`);
    console.log(`   Emergency Stop: ${data.emergency_stop}`);
    console.log(`   Active: ${data.is_active}`);
    console.log(`   Last Updated: ${new Date(data.updated_at).toLocaleString()}`);
  }

  return data as RolloutConfiguration;
}

// Update rollout percentage
async function updateRolloutPercentage(
  featureName: string = 'hybrid_progressive_capture',
  newPercentage: number
) {
  if (newPercentage < 0 || newPercentage > 100) {
    console.error('❌ Error: Rollout percentage must be between 0 and 100');
    return null;
  }

  console.log(`\n🔄 Updating rollout percentage for ${featureName} to ${newPercentage}%`);

  const { data, error } = await supabase
    .from('rollout_configuration')
    .update({
      rollout_percentage: newPercentage,
      updated_at: new Date().toISOString()
    })
    .eq('feature_name', featureName)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating rollout percentage:', error.message);
    return null;
  }

  console.log('✅ Rollout percentage updated successfully!');
  return data as RolloutConfiguration;
}

// Emergency stop
async function emergencyStop(featureName: string = 'hybrid_progressive_capture') {
  console.log(`\n🚨 Activating emergency stop for ${featureName}`);

  const { data, error } = await supabase
    .from('rollout_configuration')
    .update({
      emergency_stop: true,
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('feature_name', featureName)
    .select()
    .single();

  if (error) {
    console.error('❌ Error activating emergency stop:', error.message);
    return null;
  }

  console.log('✅ Emergency stop activated!');
  return data as RolloutConfiguration;
}

// Resume rollout
async function resumeRollout(featureName: string = 'hybrid_progressive_capture') {
  console.log(`\n▶️  Resuming rollout for ${featureName}`);

  const { data, error } = await supabase
    .from('rollout_configuration')
    .update({
      emergency_stop: false,
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('feature_name', featureName)
    .select()
    .single();

  if (error) {
    console.error('❌ Error resuming rollout:', error.message);
    return null;
  }

  console.log('✅ Rollout resumed!');
  return data as RolloutConfiguration;
}

// View rollout history
async function viewRolloutHistory(featureName: string = 'hybrid_progressive_capture', limit: number = 10) {
  console.log(`\n📜 Rollout history for ${featureName} (last ${limit} changes):`);

  const { data, error } = await supabase
    .from('rollout_history')
    .select('*')
    .eq('feature_name', featureName)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error querying rollout history:', error.message);
    return null;
  }

  if (data && data.length > 0) {
    data.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${new Date(entry.changed_at).toLocaleString()}`);
      console.log(`   Old: ${entry.old_percentage}% → New: ${entry.new_percentage}%`);
      if (entry.reason) console.log(`   Reason: ${entry.reason}`);
      if (entry.changed_by) console.log(`   Changed by: ${entry.changed_by}`);
    });
  } else {
    console.log('   No history found');
  }

  return data;
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  switch (command) {
    case 'query':
      await queryRollout(arg1 || 'hybrid_progressive_capture');
      break;

    case 'update':
      const percentage = parseInt(arg1);
      if (isNaN(percentage)) {
        console.error('❌ Error: Please provide a valid percentage number');
        console.log('Usage: npm run rollout update <percentage>');
        break;
      }
      await updateRolloutPercentage(arg2 || 'hybrid_progressive_capture', percentage);
      await queryRollout(arg2 || 'hybrid_progressive_capture');
      break;

    case 'stop':
      await emergencyStop(arg1 || 'hybrid_progressive_capture');
      break;

    case 'resume':
      await resumeRollout(arg1 || 'hybrid_progressive_capture');
      await queryRollout(arg1 || 'hybrid_progressive_capture');
      break;

    case 'history':
      const limit = arg2 ? parseInt(arg2) : 10;
      await viewRolloutHistory(arg1 || 'hybrid_progressive_capture', limit);
      break;

    default:
      console.log('📋 Rollout Manager - Available Commands:');
      console.log('');
      console.log('  npm run rollout query [feature_name]');
      console.log('    - View current rollout configuration');
      console.log('');
      console.log('  npm run rollout update <percentage> [feature_name]');
      console.log('    - Update rollout percentage (0-100)');
      console.log('');
      console.log('  npm run rollout stop [feature_name]');
      console.log('    - Activate emergency stop');
      console.log('');
      console.log('  npm run rollout resume [feature_name]');
      console.log('    - Resume rollout after emergency stop');
      console.log('');
      console.log('  npm run rollout history [feature_name] [limit]');
      console.log('    - View rollout change history');
      console.log('');
      console.log('Default feature_name: hybrid_progressive_capture');
  }

  process.exit(0);
}

main().catch(console.error);