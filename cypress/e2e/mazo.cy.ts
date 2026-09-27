describe("Crear mazo", () => {
  beforeEach(() => {
    cy.createUser("Raúl");
  });

  it("no guarda un mazo sin nombre", () => {
    cy.page().find("ion-fab-button").click();
    cy.location("pathname").should("eq", "/agregar-mazo");

    cy.page().contains("ion-button", "Guardar").click();
    cy.contains("El nombre es obligatorio.").should("be.visible");
    cy.location("pathname").should("eq", "/agregar-mazo");
  });

  it("crea un mazo con nombre y descripción y lo muestra en Home", () => {
    cy.createDeck("Vocabulario", "Palabras del día a día");

    //El estado vacío desaparece y el mazo se puede abrir
    cy.contains("Aun no tienes mazos.").should("not.exist");
    cy.openDeck("Vocabulario");
    cy.contains("No hay tarjetas en este mazo aun.").should("exist");
  });

  it("acepta un mazo solo con nombre", () => {
    cy.createDeck("Historia");
    cy.contains("Historia").should("be.visible");
  });
});
