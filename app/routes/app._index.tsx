import { useEffect, useState } from "react";
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  InlineStack,
  Spinner,
  Button,
  Banner,
} from "@shopify/polaris";
import { getSessionAndAccessToken } from "../utils/auth";
import { authenticate } from "../shopify.server";
import {
  SHOPIFY_CALLBACK,
  SHOPIFY_FULFILLMENY_SERVICE,
  SHOPIFY_GRAPHQL_VERSION,
} from "app/utils/global";
import { Redirect, Loading } from '@shopify/app-bridge/actions';
import { createApp } from '@shopify/app-bridge';
import { encryptValue } from "app/utils/encryption";

type ActionResponse = {
  success: boolean;
  message: string;
  store?: string;
  accessToken?: string;
};

type LoaderData =
  | { accessToken: string; shop: string }
  | { accessToken: null };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { accessToken } = await getSessionAndAccessToken(request);
    const laravelCrypto = process.env.SHOPIFY_LARAVEL_CRYPTO;    
    const encryptedToken = encryptValue(accessToken);

    return json({ accessToken, laravelCrypto, encryptedToken });  
  } catch (error) {
    return json<LoaderData>({ accessToken: null });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = new URLSearchParams(await request.text());
  const data = await authenticate.admin(request);
  const store = data?.session?.shop;
  const accessToken = formData.get("accessToken");

  if (!accessToken || !store) {
    return json({
      success: false,
      message: "Access token or store is missing",
    });
  }

  try {
    const fulfillmentLocationsResponse = await fetch(
      `https://${store}/admin/api/${SHOPIFY_GRAPHQL_VERSION}/fulfillment_services.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const fulfillmentLocationsResponseBody =
      await fulfillmentLocationsResponse.json();

    if (fulfillmentLocationsResponseBody.fulfillment_services.length > 0) {
      console.log(
        "Fulfillment Service Already Exists:",
        fulfillmentLocationsResponseBody.fulfillment_services[0].id
      );
    } else {
      await addFulfillmentLocation(store, accessToken);
    }

    return json({
      success: true,
      message: "Process completed successfully",
      store,
      accessToken,
    } as ActionResponse);
  } catch (error) {
    console.error("Error in the process:", error);
    return json({
      success: false,
      message: "Failed to complete the process",
    } as ActionResponse);
  }
};

const addFulfillmentLocation = async (shop: string, accessToken: string) => {
  const url = `https://${shop}/admin/api/${SHOPIFY_GRAPHQL_VERSION}/fulfillment_services.json`;

  const payload = {
    fulfillment_service: {
      name: SHOPIFY_FULFILLMENY_SERVICE,
      callback_url: SHOPIFY_CALLBACK,
      inventory_management: true,
      tracking_support: true,
      requires_shipping_method: true,
      format: "json",
      permits_sku_sharing: false,
      include_pending_stock: true,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create fulfillment service: ${response.status}`);
  }

  return await response.json();
};

export default function Index() {
  const { accessToken, laravelCrypto, encryptedToken } = useLoaderData<any>();
  const fetcher = useFetcher<ActionResponse>();
  const [appBridge, setAppBridge] = useState<ReturnType<typeof createApp> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerProcess = () => {
    if (accessToken) {
      fetcher.submit({ accessToken }, { method: "POST" });
    }
  };

  const redirectToSettings = (store?: string, token?: string) => {
    if (!store || !token) {
      setError("Missing store or token information");
      return;
    }

    // only get subdomain
    const shop = store.split(".")[0];
    const encodedToken = encodeURIComponent(encryptedToken);

    const url = `${'https://dev201-app.fatherstock-testing.in'}/setting?platform=shopify&store=${shop}&token=${accessToken}`;    

    
    try {
      if (appBridge) {
        const loading = Loading.create(appBridge);
        loading.dispatch(Loading.Action.START);
        
        const redirect = Redirect.create(appBridge);
        redirect.dispatch(Redirect.Action.REMOTE, {
          url,
          newContext: true
        });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error("Redirect failed:", e);
      setError("Failed to redirect to settings");
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        setIsReady(true);
      } else {
        setError(fetcher.data.message || "Failed to complete setup");
      }
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (accessToken) {
      triggerProcess();
    }
  }, [accessToken]);
  useEffect(() => {
    if(isReady == true){
      redirectToSettings(fetcher.data?.store, fetcher.data?.accessToken);
    }
  }, [isReady]);

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {error && (
              <Banner title="Error" tone="critical">
                {error}
              </Banner>
            )}
            
            <InlineStack gap="100" align="center" blockAlign="center" wrap={false}>
              {!isReady ? (
                <InlineStack align="center" gap="100">
                  <Spinner size="small" />
                  <h1>Connecting to mDroppy...</h1>
                </InlineStack>
              ) : (
                <InlineStack align="center" gap="100">
                  <Button 
 
                    onClick={() => redirectToSettings(fetcher.data?.store, fetcher.data?.accessToken)}
                  >
                    Complete Setup in mDroppy
                  </Button>
                </InlineStack>
              )}
            </InlineStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}