/**
 * OpenAI Apps Domain Verification Challenge
 *
 * GET /.well-known/openai-apps-challenge
 *
 * This endpoint returns the verification token required by OpenAI
 * to verify domain ownership for ChatGPT App submission.
 *
 * Set the OPENAI_VERIFICATION_TOKEN environment variable in Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.OPENAI_VERIFICATION_TOKEN;

  if (!token) {
    res.status(404).send('Verification token not configured');
    return;
  }

  // Return plain text token as required by OpenAI
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(token);
}
