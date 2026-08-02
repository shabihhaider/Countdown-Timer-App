import { redirect } from "@remix-run/node";
import { Form, useLoaderData, Link } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Countdown Timer Bar</h1>
        <p className={styles.text}>
          Create real urgency and drive more sales with a customizable countdown timer on your
          Shopify store.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Easy setup in 2 minutes.</strong> No coding required — configure your timer,
            choose your design, and go live instantly.
          </li>
          <li>
            <strong>Real countdown timers.</strong> End dates are stored server-side in UTC so your
            deadline is the same for every visitor, every browser, every device.
          </li>
          <li>
            <strong>Conversion analytics.</strong> See how many impressions and clicks your timer
            generates so you can measure ROI directly in the app.
          </li>
        </ul>
        <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#888" }}>
          <Link to="/privacy">Privacy Policy</Link>
          {" · "}
          <Link to="/terms">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
