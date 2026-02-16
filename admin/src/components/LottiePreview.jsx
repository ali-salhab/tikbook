import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";

const LottiePreview = ({ file, url, className, style }) => {
  const [animationData, setAnimationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          setAnimationData(json);
        } catch (err) {
          console.error("Invalid Lottie JSON file", err);
          setError("Invalid JSON");
        }
      };
      reader.readAsText(file);
    } else if (url) {
      fetch(url)
        .then((res) => res.json())
        .then((data) => setAnimationData(data))
        .catch((err) => {
          console.error("Failed to load Lottie from URL", err);
          setError("Failed to load");
        });
    }
  }, [file, url]);

  if (error) {
    return (
      <div className={`lottie-error ${className}`} style={style}>
        Failed to load animation
      </div>
    );
  }

  if (!animationData) {
    return (
      <div className={`lottie-loading ${className}`} style={style}>
        Loading...
      </div>
    );
  }

  return (
    <Lottie
      animationData={animationData}
      loop={true}
      className={className}
      style={style}
    />
  );
};

export default LottiePreview;
