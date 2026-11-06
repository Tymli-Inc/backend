import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    console.log('⚙️  Adding subscription columns to users table...');
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
      ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
      ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false
    `;
    console.log('✅ Subscription columns added');
    
    console.log('⚙️  Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_paddle_customer ON users(paddle_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_paddle_subscription ON users(paddle_subscription_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type)`;
    console.log('✅ Indexes created');
    
    console.log('⚙️  Creating payment_history table...');
    await sql`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        paddle_transaction_id VARCHAR(255),
        paddle_subscription_id VARCHAR(255),
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        status VARCHAR(50) NOT NULL,
        plan_type VARCHAR(20),
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `;
    console.log('✅ payment_history table created');
    
    console.log('⚙️  Creating payment_history indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_history_transaction ON payment_history(paddle_transaction_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(paddle_subscription_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status)`;
    console.log('✅ payment_history indexes created');
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Subscription columns added to users table');
    console.log('✅ payment_history table created');
    console.log('✅ Indexes created for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
