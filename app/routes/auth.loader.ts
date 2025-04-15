import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";


export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const sessionP = await authenticate.admin(request);
    const session = sessionP?.admin?.rest.session;

    if (!session || !session.accessToken) {
      return json({ accessToken: null });
    }

    return json({ accessToken: session.accessToken });
  } catch (error) {
    console.error("Error retrieving session or access token:", error);
    return json({ accessToken: null });
  }
};