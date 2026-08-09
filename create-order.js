export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Méthode non autorisée"
        });
    }

    const products = {
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

    try {
        const { productId } = req.body;

        const product = products[productId];

        if (!product) {
            return res.status(400).json({
                error: "Produit invalide"
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

        const tokenResponse = await fetch(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body:
                    "grant_type=client_credentials"
            }
        );

        const tokenData =
            await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(tokenData);

            return res.status(500).json({
                error:
                    "Impossible de se connecter à PayPal"
            });
        }

        const orderResponse = await fetch(
            "https://api-m.sandbox.paypal.com/v2/checkout/orders",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${tokenData.access_token}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    intent: "CAPTURE",

                    purchase_units: [
                        {
                            description:
                                product.name,

                            amount: {
                                currency_code: "EUR",
                                value:
                                    product.price
                            }
                        }
                    ],

                    application_context: {

                        brand_name:
                            "Shop Fire",

                        user_action:
                            "PAY_NOW",

                        return_url:
                            `${process.env.SITE_URL}/?paypal=success`,

                        cancel_url:
                            `${process.env.SITE_URL}/?paypal=cancel`
                    }
                })
            }
        );

        const orderData =
            await orderResponse.json();

        if (!orderResponse.ok) {
            console.error(orderData);

            return res.status(500).json({
                error:
                    "Impossible de créer la commande PayPal"
            });
        }

        const approvalLink =
            orderData.links?.find(
                link =>
                    link.rel === "approve"
            );

        if (!approvalLink) {
            return res.status(500).json({
                error:
                    "Lien de paiement PayPal introuvable"
            });
        }

        return res.status(200).json({

            approvalUrl:
                approvalLink.href,

            orderID:
                orderData.id
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error:
                "Erreur serveur PayPal"
        });
    }
}
