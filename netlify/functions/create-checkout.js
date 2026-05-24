const https = require('https');
const querystring = require('querystring');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { items, successUrl, cancelUrl } = JSON.parse(event.body);

  const params = {
    mode: 'payment',
    success_url: successUrl || 'https://sailortales.netlify.app/?commande=ok',
    cancel_url: cancelUrl || 'https://sailortales.netlify.app',
    locale: 'fr',
    'shipping_address_collection[allowed_countries][0]': 'FR',
  };

  items.forEach((item, i) => {
    params[`line_items[${i}][price_data][currency]`] = 'eur';
    params[`line_items[${i}][price_data][product_data][name]`] = `${item.name} — Taille ${item.size}`;
    params[`line_items[${i}][price_data][product_data][description]`] = 'Sailor Tales · Coton bio GOTS · Manches longues';
    params[`line_items[${i}][price_data][unit_amount]`] = String(item.price * 100);
    params[`line_items[${i}][quantity]`] = '1';
  });

  const postData = querystring.stringify(params);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.stripe.com',
      path: '/v1/checkout/sessions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const session = JSON.parse(data);
        if (session.error) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: session.error.message }) });
        } else {
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: session.url }),
          });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
    });
    req.write(postData);
    req.end();
  });
};
