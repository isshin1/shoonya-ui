import { useEffect } from "react";

export default function IFrameBypass({ src }) {
  useEffect(() => {
    // Dynamically load x-frame-bypass and custom-elements-builtin
    const loadScripts = async () => {
      const script1 = document.createElement("script");
      script1.src = "https://unpkg.com/@ungap/custom-elements-builtin";
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src = "/x-frame-bypass.js"; // From public folder
      script2.type = "module";
      document.body.appendChild(script2);
    };

    loadScripts();
  }, []);

  return (
    <div>
      <h2>Bypassing X-Frame Restrictions</h2>
      <iframe
        is="x-frame-bypass"
        src={src}
        width="100%"
        height="600px"
        style={{ border: "none" }}
      />
    </div>
  );
}
