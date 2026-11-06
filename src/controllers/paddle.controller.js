import sql from "../database/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getUserId } from "../utils/getUserId.js";
import paddle from "../utils/paddle.js";
import crypto from 'crypto';

/**
 * Get Paddle Prices for checkout
 * POST /api/v1/paddle/get-prices
 * Body: { token }
 */
const getPrices = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const userId = await getUserId(token);
    if (!userId) {
      throw new ApiError(401, "Invalid token");
    }

    // Return price IDs from environment
    const prices = {
      monthly: process.env.PADDLE_PRICE_MONTHLY,
      annual: process.env.PADDLE_PRICE_ANNUAL,
    };

    if (!prices.monthly || !prices.annual) {
      throw new ApiError(500, "Paddle price IDs not configured");
    }

    res.status(200).json(
      new ApiResponse(200, prices, "Price IDs retrieved successfully")
    );
  } catch (error) {
    console.error('Get prices error:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, null, error.message || "Internal server error"));
    }
  }
});

/**
 * Create or get Paddle customer
 * POST /api/v1/paddle/get-customer
 * Body: { token }
 */
const getOrCreateCustomer = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const userId = await getUserId(token);
    if (!userId) {
      throw new ApiError(401, "Invalid token");
    }

    // Get user details
    const userResult = await sql`
      SELECT id, email, name, paddle_customer_id FROM users WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const user = userResult[0];
    let customerId = user.paddle_customer_id;

    // Create Paddle customer if doesn't exist
    if (!customerId) {
      const customer = await paddle.customers.create({
        email: user.email,
        name: user.name,
      });

      customerId = customer.id;

      // Save customer ID to database
      await sql`
        UPDATE users 
        SET paddle_customer_id = ${customerId}
        WHERE id = ${userId}
      `;
    }

    res.status(200).json(
      new ApiResponse(200, { customerId }, "Customer retrieved successfully")
    );
  } catch (error) {
    console.error('Get customer error:', error);
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, null, error.message || "Internal server error"));
    }
  }
});

/**
 * Paddle Webhook Handler
 * POST /api/v1/paddle/webhook
 * Handles Paddle notification events
 */
const handleWebhook = asyncHandler(async (req, res) => {
  try {
    const signature = req.body.signature;
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    // Verify webhook signature
    const eventData = req.body;
    
    // Paddle includes signature in the body
    if (!signature) {
      console.error('No signature in webhook');
      return res.status(400).send('No signature provided');
    }

    // Verify the signature
    const isValid = verifyPaddleWebhook(eventData, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const eventType = eventData.event_type;
    console.log(`Received Paddle webhook: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'subscription.created':
        await handleSubscriptionCreated(eventData.data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(eventData.data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(eventData.data);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(eventData.data);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(eventData.data);
        break;

      case 'transaction.completed':
        await handleTransactionCompleted(eventData.data);
        break;

      case 'transaction.payment_failed':
        await handlePaymentFailed(eventData.data);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Verify Paddle webhook signature
 */
function verifyPaddleWebhook(eventData, signature, secret) {
  try {
    // Extract signature parts
    const [ts, h1] = signature.split(';').map(part => part.split('=')[1]);
    
    // Create signed payload
    const signedPayload = `${ts}:${JSON.stringify(eventData)}`;
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    return h1 === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  const customerId = subscription.customer_id;
  
  // Get user by customer ID
  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Determine plan type from price ID
  const priceId = subscription.items[0]?.price?.id;
  let planType = 'pro_monthly';
  
  if (priceId === process.env.PADDLE_PRICE_ANNUAL) {
    planType = 'pro_annual';
  }

  // Update user in database
  await sql`
    UPDATE users
    SET 
      plan_type = ${planType},
      plan_status = ${subscription.status},
      paddle_subscription_id = ${subscription.id},
      current_period_start = ${subscription.current_billing_period?.starts_at},
      current_period_end = ${subscription.current_billing_period?.ends_at},
      cancel_at_period_end = ${subscription.scheduled_change?.action === 'cancel'}
    WHERE id = ${userId}
  `;

  console.log(`User ${userId} upgraded to ${planType}`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Determine plan type
  const priceId = subscription.items[0]?.price?.id;
  let planType = 'pro_monthly';
  
  if (priceId === process.env.PADDLE_PRICE_ANNUAL) {
    planType = 'pro_annual';
  }

  await sql`
    UPDATE users
    SET 
      plan_type = ${planType},
      plan_status = ${subscription.status},
      paddle_subscription_id = ${subscription.id},
      current_period_start = ${subscription.current_billing_period?.starts_at},
      current_period_end = ${subscription.current_billing_period?.ends_at},
      cancel_at_period_end = ${subscription.scheduled_change?.action === 'cancel'}
    WHERE id = ${userId}
  `;

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription) {
  const customerId = subscription.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Downgrade user to free plan
  await sql`
    UPDATE users
    SET 
      plan_type = 'free',
      plan_status = 'canceled',
      cancel_at_period_end = false
    WHERE id = ${userId}
  `;

  console.log(`User ${userId} downgraded to free plan`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription) {
  const customerId = subscription.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) return;

  const userId = userResult[0].id;

  await sql`
    UPDATE users
    SET plan_status = 'paused'
    WHERE id = ${userId}
  `;

  console.log(`Subscription paused for user ${userId}`);
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(subscription) {
  const customerId = subscription.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) return;

  const userId = userResult[0].id;

  await sql`
    UPDATE users
    SET plan_status = 'active'
    WHERE id = ${userId}
  `;

  console.log(`Subscription resumed for user ${userId}`);
}

/**
 * Handle successful transaction
 */
async function handleTransactionCompleted(transaction) {
  const customerId = transaction.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Determine plan type from line items
  const priceId = transaction.items[0]?.price?.id;
  let planType = 'pro_monthly';
  
  if (priceId === process.env.PADDLE_PRICE_ANNUAL) {
    planType = 'pro_annual';
  }

  // Record payment in history
  await sql`
    INSERT INTO payment_history (
      user_id,
      paddle_transaction_id,
      paddle_subscription_id,
      amount,
      currency,
      status,
      plan_type,
      payment_method,
      metadata
    ) VALUES (
      ${userId},
      ${transaction.id},
      ${transaction.subscription_id || null},
      ${parseInt(transaction.details.totals.total)},
      ${transaction.currency_code},
      'completed',
      ${planType},
      ${transaction.payments?.[0]?.method_details?.type || 'card'},
      ${JSON.stringify({ 
        receipt_url: transaction.receipt_url,
        billed_at: transaction.billed_at 
      })}
    )
  `;

  console.log(`Payment recorded for user ${userId}: ${transaction.details.totals.total} ${transaction.currency_code}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(transaction) {
  const customerId = transaction.customer_id;

  const userResult = await sql`
    SELECT id FROM users WHERE paddle_customer_id = ${customerId}
  `;

  if (userResult.length === 0) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const userId = userResult[0].id;

  // Update user status to past_due
  await sql`
    UPDATE users
    SET plan_status = 'past_due'
    WHERE id = ${userId}
  `;

  console.log(`Payment failed for user ${userId}, marked as past_due`);
}

/**
 * Get subscription status
 * POST /api/v1/paddle/subscription-status
 * Body: { token }
 */
const getSubscriptionStatus = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const userId = await getUserId(token);
    if (!userId) {
      throw new ApiError(401, "Invalid token");
    }

    const userResult = await sql`
      SELECT 
        plan_type, 
        plan_status, 
        paddle_subscription_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      FROM users 
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const user = userResult[0];

    // Get detailed subscription info from Paddle if exists
    let subscriptionDetails = null;
    if (user.paddle_subscription_id) {
      try {
        subscriptionDetails = await paddle.subscriptions.get(user.paddle_subscription_id);
      } catch (err) {
        console.error('Error fetching subscription from Paddle:', err);
      }
    }

    res.status(200).json(
      new ApiResponse(200, {
        plan_type: user.plan_type,
        plan_status: user.plan_status,
        is_pro: user.plan_type !== 'free' && user.plan_status === 'active',
        cancel_at_period_end: user.cancel_at_period_end,
        current_period_end: user.current_period_end,
        subscription: subscriptionDetails,
      }, "Subscription status retrieved")
    );
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, null, "Internal server error"));
    }
  }
});

/**
 * Cancel subscription
 * POST /api/v1/paddle/cancel-subscription
 * Body: { token }
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const userId = await getUserId(token);
    if (!userId) {
      throw new ApiError(401, "Invalid token");
    }

    const userResult = await sql`
      SELECT paddle_subscription_id FROM users WHERE id = ${userId}
    `;

    if (userResult.length === 0 || !userResult[0].paddle_subscription_id) {
      throw new ApiError(404, "No active subscription found");
    }

    const subscriptionId = userResult[0].paddle_subscription_id;

    // Cancel subscription at period end
    const subscription = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    });

    // Update database
    await sql`
      UPDATE users
      SET cancel_at_period_end = true
      WHERE id = ${userId}
    `;

    res.status(200).json(
      new ApiResponse(200, {
        cancel_at_period_end: true,
        period_end: subscription.current_billing_period?.ends_at,
      }, "Subscription will be canceled at period end")
    );
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, null, error.message || "Internal server error"));
    }
  }
});

/**
 * Get update payment method URL
 * POST /api/v1/paddle/update-payment-url
 * Body: { token }
 */
const getUpdatePaymentUrl = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    const userId = await getUserId(token);
    if (!userId) {
      throw new ApiError(401, "Invalid token");
    }

    const userResult = await sql`
      SELECT paddle_subscription_id FROM users WHERE id = ${userId}
    `;

    if (userResult.length === 0 || !userResult[0].paddle_subscription_id) {
      throw new ApiError(404, "No active subscription found");
    }

    const subscriptionId = userResult[0].paddle_subscription_id;

    // Get update payment method transaction
    const transaction = await paddle.subscriptions.getPaymentMethodChangeTransaction(subscriptionId);

    res.status(200).json(
      new ApiResponse(200, { 
        url: transaction.checkout?.url || null,
        transactionId: transaction.id 
      }, "Payment update URL retrieved")
    );
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
      res.status(500).json(new ApiResponse(500, null, error.message || "Internal server error"));
    }
  }
});

export {
  getPrices,
  getOrCreateCustomer,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription,
  getUpdatePaymentUrl,
};
