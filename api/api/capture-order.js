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
    throw new Error("Impossible de récupérer le token PayPal");
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

    const { orderID } = req.body || {};

    if (!orderID) {

      return res.status(400).json({
        error: "Order ID manquant"
      });

    }


    const accessToken = await getAccessToken();


    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );


    const data = await response.json();


    if (!response.ok) {

      console.error(data);

      return res.status(response.status).json({
        error: "Impossible de confirmer le paiement"
      });

    }


    return res.status(200).json({
      success: data.status === "COMPLETED",
      status: data.status
    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Erreur serveur"
    });

  }

}
