import { useState } from "react";

export default function TestApp() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Test App - Route Runner</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <div style={{ marginTop: "20px" }}>
        <a href="https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev" style={{ color: "blue" }}>
          App Link
        </a>
      </div>
    </div>
  );
}