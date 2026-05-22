exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { items, successUrl, cancelUrl } = JSON.parse(event.body);

  // Construire les paramètres pour l'API Stripe
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', successUrl || 'https://ton-site.netlify.app/merci');
  params.append('cancel_url', cancelUrl || 'https://ton-site.netlify.app');
  params.append('locale', 'fr');

  items.forEach((item, i) => {
    params.append(`line_items[${i}][price_data][currency]`, 'eur');
    params.append(`line_items[${i}][price_data][product_data][name]`, `${item.name} — Taille ${item.size}`);
    params.append(`line_items[${i}][price_data][product_data][description]`, 'Sailor Tales · Coton bio GOTS · Manches longues');
    params.append(`line_items[${i}][price_data][unit_amount]`, String(item.price * 100)); // en centimes
    params.append(`line_items[${i}][quantity]`, '1');
  });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      console.error('Stripe error:', session.error);
      return { statusCode: 500, body: JSON.stringify({ error: session.error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
