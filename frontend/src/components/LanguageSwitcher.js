import React from "react";
import { useLanguage } from "../context/LanguageProvider";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="language-switcher-dropdown">
      <select value={language} onChange={handleLanguageChange}>
        <option value="en">English</option>
        <option value="kannada">ಕನ್ನಡ</option>
        <option value="tulu">ತುಳು</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
