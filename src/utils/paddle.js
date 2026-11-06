import { Paddle } from '@paddle/paddle-node-sdk';

if (!process.env.PADDLE_API_KEY) {
  throw new Error('PADDLE_API_KEY is not set in environment variables');
}

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: process.env.PADDLE_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
});

export default paddle;
