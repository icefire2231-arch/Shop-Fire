const PRODUCTS = {
  pass_coc: {
    name: "Pass Clash of Clans",
    price: "5.00"
  },
  brawl_stars: {
    name: "Brawl Stars",
    price: "8.00"
  },
  decor_coc: {
    name: "Décor Clash of Clans",
    price: "3.00"
  },
  script_troupes: {
    name: "Script demande de troupes",
    price: "15.00"
  },
  dons_auto: {
    name: "Dons auto",
    price: "5.00"
  },
  farm_ressources: {
    name: "Farm ressources",
    price: "5.00"
  }
};

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Variables PayPal manquantes");
  }

  const credentials = Buffer
    .from(`${clientId}:${clientSecret}`)
    .toString("base64");

  const response = await fetch(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    throw new Error("Impossible de se connecter à PayPal");
  }

  const data = await response.json();

  return data.access_token;
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  try {

    const { productId } = req.body || {};

    const product = PRODUCTS[productId];

    if (!product) {
      return res.status(400).json({
        error: "Produit invalide"
      });
    }

    const accessToken = await getAccessToken();

    const origin =
      req.headers.origin ||
      "https://shop-fire-zeta.vercel.app";

    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },

        body: JSON.stringify({
          intent: "CAPTURE",

          purchase_units: [
            {
              description: product.name,

              amount: {
                currency_code: "EUR",
                value: product.price
              }
            }
          ],

          application_context: {
            brand_name: "Shop Fire",
            user_action: "PAY_NOW",

            return_url:
              `${origin}/?paypal=success`,

            cancel_url:
              `${origin}/?paypal=cancel`
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(response.status).json({
        error: "PayPal n'a pas pu créer la commande"
      });
    }

    const approvalLink = data.links?.find(
      link => link.rel === "approve"
    );

    if (!approvalLink) {
      return res.status(500).json({
        error: "Lien PayPal introuvable"
      });
    }

    return res.status(200).json({
      orderID: data.id,
      approvalUrl: approvalLink.href
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Erreur serveur"
    });
  }
}
