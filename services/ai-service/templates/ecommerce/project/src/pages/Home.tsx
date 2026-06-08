import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <section className="home">
      <h1>Welcome to your store</h1>
      <p>Browse products, manage your cart, and sign in with Supabase auth.</p>
      <div className="home-actions">
        <Link to="/products" className="btn btn-primary">
          Shop products
        </Link>
        <Link to="/login" className="btn btn-secondary">
          Sign in
        </Link>
      </div>
    </section>
  );
}
