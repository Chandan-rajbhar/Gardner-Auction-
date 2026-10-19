import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400, req);
    }

    const { bid } = body;
    if (!bid || !bid.amount || !bid.paddleNumber) {
      return jsonResponse({ success: false, error: 'Bid amount and paddle number are required' }, 400, req);
    }

    const processedBid = {
      id: `bid-${Date.now()}`,
      lotId: bid.lotId,
      lotNumber: bid.lotNumber,
      amount: Number(bid.amount),
      paddleNumber: bid.paddleNumber,
      bidderName: bid.bidderName || 'Registered Bidder',
      source: bid.source || 'Internet AF360',
      timestamp: new Date().toISOString(),
    };

    // Attempt to store in Supabase bids table using secret key
    try {
      await fetch(`${url}/rest/v1/bids`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          lot_id: processedBid.lotId,
          lot_number: processedBid.lotNumber,
          amount: processedBid.amount,
          paddle_number: processedBid.paddleNumber,
          bidder_name: processedBid.bidderName,
          source: processedBid.source,
          created_at: processedBid.timestamp,
        }),
      });
    } catch (insertErr) {
      console.warn('Bid table sync notice:', insertErr);
    }

    return jsonResponse(
      {
        success: true,
        message: 'Live bid registered on Edge Gateway',
        bid: processedBid,
      },
      200,
      req
    );
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}
