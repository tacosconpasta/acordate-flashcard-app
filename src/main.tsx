import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";
import { defineCustomElements as ionicPwa } from "@ionic/pwa-elements/loader";
import App from "./App";

jeepSqlite(window);
ionicPwa(window);

const initWeb = async () => {
  if (Capacitor.getPlatform() === "web") {
    const jeepEl = document.createElement("jeep-sqlite");
    document.body.appendChild(jeepEl);
    await customElements.whenDefined("jeep-sqlite");
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.initWebStore();
  }
};

initWeb().then(() => {
  const container = document.getElementById("root");
  const root = createRoot(container!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
