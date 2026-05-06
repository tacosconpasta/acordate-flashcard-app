import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import Home from "./pages/Home";

//CSS Imports

/* Core CSS required for Ionic components to work properly */
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/normalize.css";
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/structure.css";
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/padding.css";

// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/float-elements.css";

// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/text-alignment.css";

// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/text-transformation.css";

// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/flex-utils.css";

// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
// @ts-ignore: side-effect import of CSS without type declarations
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
// @ts-ignore: side-effect import of CSS without type declarations
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home">
          <Home />
        </Route>
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
