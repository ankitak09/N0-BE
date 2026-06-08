import "./Products.css";

const DEMO_PRODUCTS = [
  { id: "1", name: "Wireless Headphones", price: 89.99 },
  { id: "2", name: "Smart Watch", price: 149.0 },
  { id: "3", name: "USB-C Hub", price: 39.5 },
];

export default function Products() {
  return (
    <section className="products">
      <h1>Products</h1>
      <p className="products-sub">Demo catalog — connect Supabase to load real inventory.</p>
      <ul className="product-grid">
        {DEMO_PRODUCTS.map((product) => (
          <li key={product.id} className="product-card">
            <h2>{product.name}</h2>
            <p>${product.price.toFixed(2)}</p>
            <button type="button">Add to cart</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
