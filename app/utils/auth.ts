import { authenticate } from "../shopify.server";

// app/utils/auth.ts
export const getSessionAndAccessToken = async (request: Request) => {
    try {
      const sessionP = await authenticate.admin(request);
  
      if (!sessionP || !sessionP.admin || !sessionP.admin.rest || !sessionP.admin.rest.session) {
        throw new Error("Session or access token is missing or invalid");
      }
  
      const session = sessionP.admin.rest.session;
  
      if (!session || !session.accessToken) {
        throw new Error("Session or access token is missing");
      }
  
      return { session, accessToken: session.accessToken };
    } catch (error) {
      console.error("Error retrieving session or access token:", error);
      throw error;
    }
  };
  