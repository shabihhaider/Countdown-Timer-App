import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    const shop = session.shop;

    const savedSetting = await db.setting.findUnique({
      where: { shop: shop }
    });

    if (savedSetting && savedSetting.value) {
      const settings = JSON.parse(savedSetting.value);
      return json({ success: true, settings });
    }

    return json({ success: false, message: "No settings found" });
  } catch (error) {
    console.error("API Settings error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};