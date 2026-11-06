-- Migration: Add subscription and payment tracking columns to users table
-- Purpose: Enable Paddle subscription management and plan tracking
-- Date: 2026-11-06
-- Payment Provider: Paddle

-- Add subscription columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_paddle_customer ON users(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_paddle_subscription ON users(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);

-- Create payment_history table for tracking all transactions
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
);

-- Indexes for payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_transaction ON payment_history(paddle_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- Comments for documentation
COMMENT ON COLUMN users.plan_type IS 'User subscription plan: free, pro_monthly, pro_annual';
COMMENT ON COLUMN users.plan_status IS 'Subscription status: active, past_due, canceled, paused, trialing';
COMMENT ON COLUMN users.paddle_customer_id IS 'Paddle customer ID for payment management';
COMMENT ON COLUMN users.paddle_subscription_id IS 'Paddle subscription ID';
COMMENT ON COLUMN users.cancel_at_period_end IS 'True if user canceled but subscription is active until period ends';

COMMENT ON TABLE payment_history IS 'Historical record of all Paddle payment transactions';
