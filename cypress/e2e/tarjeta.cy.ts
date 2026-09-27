describe("Crear tarjeta", () => {
  beforeEach(() => {
    cy.createUser("Raúl");
    cy.createDeck("Vocabulario");
    cy.openDeck("Vocabulario");
  });

  it("exige frente y reverso", () => {
    cy.page().find("ion-fab-button").click();
    cy.location("pathname").should("match", /^\/agregar-tarjeta\/\d+$/);

    cy.page().contains("ion-button", "Guardar").click();
    cy.contains("Escribe el frente de la tarjeta.").should("be.visible");
    cy.contains("Escribe el reverso de la tarjeta.").should("be.visible");

    //Con solo el frente sigue faltando el reverso
    cy.get('textarea[placeholder="Ej. Hello"]').type("Hello");
    cy.page().contains("ion-button", "Guardar").click();
    cy.contains("Escribe el reverso de la tarjeta.").should("be.visible");
    cy.location("pathname").should("match", /^\/agregar-tarjeta\/\d+$/);
  });

  it("crea una tarjeta y aparece en la lista del mazo", () => {
    cy.createCard("Hello", "Hola", "Saludo");

    // La lista está desenfocada hasta pulsar Editar; el texto ya existe en la página
    cy.contains("No hay tarjetas en este mazo aun.").should("not.exist");
    cy.page().contains("ion-button", "Editar").click();
    cy.contains("Hello").should("be.visible");
    cy.contains("Hola").should("be.visible");
  });

  it("acumula varias tarjetas en el mismo mazo", () => {
    cy.createCard("Cat", "Gato");
    cy.createCard("Dog", "Perro");

    cy.page().contains("ion-button", "Editar").click();
    cy.contains("Cat").should("be.visible");
    cy.contains("Dog").should("be.visible");
  });
});
