import { json } from "@remix-run/node";
import db from "../db.server";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return json({ success: false, error: "Shop parameter required" }, { status: 400 });
    }

    const saved = await db.setting.findUnique({ where: { shop } });
    if (saved?.value) {
      const settings = JSON.parse(saved.value);
      return json({ success: true, settings }, {
        headers: {
          "Cache-Control": "public, max-age=60"
        }
      });
    }

    return json({ success: false, message: "No settings found" });
  } catch (e) {
    console.error("Proxy settings error:", e);
    return json({ success: false, error: e.message }, { status: 500 });
  }
};