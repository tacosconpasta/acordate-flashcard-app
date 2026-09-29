describe("Crear usuario", () => {
  it("pide el nombre antes de empezar", () => {
    cy.visit("/");
    cy.location("pathname", { timeout: 20000 }).should("eq", "/bienvenida");

    //Sin nombre el botón queda deshabilitado; con nombre se habilita
    cy.contains("ion-button", "Empezar").should("have.class", "button-disabled");
    cy.get('input[placeholder="Ej. Maria"]', { timeout: 20000 }).type("Raúl");
    cy.contains("ion-button", "Empezar").should("not.have.class", "button-disabled");

    // Borrar el nombre lo vuelve a deshabilitar
    cy.get('input[placeholder="Ej. Maria"]').clear();
    cy.contains("ion-button", "Empezar").should("have.class", "button-disabled");
    cy.location("pathname").should("eq", "/bienvenida");
  });

  it("crea el usuario y entra a Home sin mazos", () => {
    cy.createUser("Raúl");

    // Al recargar, la base web vuelve a estar vacía y el flujo empieza de nuevo
    cy.contains("Presiona + para crear uno.").should("be.visible");
  });
});
