/// <reference types="cypress" />

/**
 * Comandos compartidos por los specs. Cada uno deja la app en un estado
 * conocido para que el siguiente paso no repita el flujo completo.
 *
 * La base de datos web vive en memoria y no se persiste, así que cada
 * `cy.visit` arranca con una base vacía y las pruebas quedan aisladas.
 */

// Tiempo de espera generoso para la primera carga: el motor SQLite en WASM tarda en iniciar
const BOOT_TIMEOUT = 20000;

//Ionic deja la página anterior montada y visible mientras transiciona, así que se busca siempre en la página superior
Cypress.Commands.add("page", () => {
  return cy.get("ion-router-outlet > .ion-page:not(.ion-page-hidden)").last();
});

function fab() {
  return cy.page().find("ion-fab-button");
}
function button(text: string) {
  return cy.page().contains("ion-button", text);
}

Cypress.Commands.add("createUser", (name: string) => {
  cy.visit("/");

  //Sin usuarios la app manda al onboarding
  cy.location("pathname", { timeout: BOOT_TIMEOUT }).should("eq", "/bienvenida");
  cy.get('input[placeholder="Ej. Maria"]', { timeout: BOOT_TIMEOUT }).type(name);
  button("Empezar").click();

  // Home con el estado vacío confirma que el usuario ya existe
  cy.location("pathname", { timeout: BOOT_TIMEOUT }).should("eq", "/home");
  cy.contains("Aun no tienes mazos.", { timeout: BOOT_TIMEOUT }).should("be.visible");
});

Cypress.Commands.add("createDeck", (name: string, description = "") => {
  fab().click();
  cy.location("pathname").should("eq", "/agregar-mazo");

  cy.get('input[placeholder="Ej. Vocabulario en inglés"]').type(name);
  if (description) {
    cy.get('textarea[placeholder="Ej. Palabras comunes del dia a dia"]').type(description);
  }
  button("Guardar").click();

  //Guardar vuelve a Home, donde el mazo nuevo aparece en la lista
  cy.location("pathname").should("eq", "/home");
  cy.contains(name).should("be.visible");
});

Cypress.Commands.add("openDeck", (name: string) => {
  cy.contains(name).click();
  cy.location("pathname").should("match", /^\/ver-mazo\/\d+$/);
});

Cypress.Commands.add("createCard", (front: string, back: string, description = "") => {
  fab().click();
  cy.location("pathname").should("match", /^\/agregar-tarjeta\/\d+$/);

  cy.get('textarea[placeholder="Ej. Hello"]').type(front);
  cy.get('textarea[placeholder="Ej. Hola"]').type(back);
  if (description) {
    cy.get('textarea[placeholder="Descripcion (opcional)"]').type(description);
  }
  button("Guardar").click();

  // Guardar vuelve al mazo
  cy.location("pathname").should("match", /^\/ver-mazo\/\d+$/);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** La página superior del router de Ionic, donde viven los controles activos. */
      page(): Chainable<JQuery<HTMLElement>>;
      /** Pasa por el onboarding con el nombre dado y termina en Home vacío. */
      createUser(name: string): Chainable<void>;
      /** Desde Home, crea un mazo y vuelve a Home. */
      createDeck(name: string, description?: string): Chainable<void>;
      /** Desde Home, abre el mazo con ese nombre. */
      openDeck(name: string): Chainable<void>;
      /** Desde la vista de un mazo, crea una tarjeta y vuelve al mazo. */
      createCard(front: string, back: string, description?: string): Chainable<void>;
    }
  }
}

export {};
