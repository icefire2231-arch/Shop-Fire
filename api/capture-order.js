export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Méthode non autorisée"
        });
    }

    try {
        const { orderID } = req.body;

        if (!orderID) {
            return res.status(400).json({
                error: "Order ID manquant"
            });
        }

        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).json({
                error: "Variables PayPal manquantes dans Vercel"
            });
        }

        const auth = Buffer
            .from(`${clientId}:${clientSecret}`)
            .toString("base64");

        // Obtenir le token PayPal
        const tokenResponse = await fetch(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: "grant_type=client_credentials"
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(tokenData);

            return res.status(500).json({
                error: "Impossible de se connecter à PayPal"
            });
        }

        // Capturer le paiement
        const captureResponse = await fetch(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
            {
                method: "POST",
                headers: {
                    "Authorization":
                        `Bearer ${tokenData.access_token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const captureData = await captureResponse.json();

        if (!captureResponse.ok) {
            console.error(captureData);

            return res.status(500).json({
                error:
                    "Impossible de confirmer le paiement PayPal"
            });
        }

        // Vérifier que le paiement est terminé
        const capture =
            captureData.purchase_units?.[0]
                ?.payments
                ?.captures?.[0];

        if (!capture || capture.status !== "COMPLETED") {
            return res.status(400).json({
                success: false,
                error: "Le paiement n'est pas confirmé"
            });
        }

        return res.status(200).json({
            success: true,
            orderID: orderID,
            captureID: capture.id
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            error: "Erreur lors de la confirmation du paiement"
        });
    }
}
