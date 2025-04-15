import type { ActionFunctionArgs } from "@remix-run/node";
import { LARAVEL_API, LARAVEL_FULFILLMENT_REQUEST, LARAVEL_SECRET } from "app/utils/global";

export async function action({ request }: ActionFunctionArgs) {
  try {
    // ✅ Get store name from Shopify header
    const store = request.headers.get("x-shopify-shop-domain");
    if (!store) {
      console.error("Missing shop domain in webhook request");
      return new Response("Missing shop domain", { status: 400 });
    }

    // ✅ Parse the request body as JSON
    const rawBody = await request.json();

    // ✅ Check if it's a fulfillment request
    if (rawBody.kind === "FULFILLMENT_REQUEST") {
      // ✅ Send request to your API
      const response = await fetch(LARAVEL_API+LARAVEL_FULFILLMENT_REQUEST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MDROPPY": LARAVEL_SECRET,
        },
        body: JSON.stringify({
          store_name: store,
          kind: rawBody.kind,
        }),
      });
      console.log("Fulfillment request sent to API:", response);

      // ✅ Check if the external API responded successfully
      if (!response.ok) {
        console.error("Failed to send fulfillment request to API:", response.statusText);
        return new Response("Error processing fulfillment request", { status: 500 });
      }
    }

    // ✅ Respond to Shopify with 204 - No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error processing fulfillment request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
