import { useEffect, useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonAlert,
  IonFab,
  IonFabButton,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  addOutline,
  arrowBackOutline,
  createOutline,
  trashOutline,
  eyeOutline,
  eyeOffOutline,
  playOutline,
  layersOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import { getDeckById, getCards, deleteCard } from "../lib/Database";
import type { Deck } from "../models/Deck";
import type { Card } from "../models/Card";

const ViewDeck: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const found = await getDeckById(Number(id));
      if (!found) {
        setError("Mazo no encontrado.");
        return;
      }
      setDeck(found);
      setCards(await getCards(Number(id)));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);
  useIonViewWillEnter(() => {
    load();
  });

  return (
    <IonPage>
      <IonContent
        style={
          {
            "--padding-top": "0px",
            "--padding-bottom": "calc(80px + var(--ion-safe-area-bottom))",
            "--padding-start": "0px",
            "--padding-end": "0px",
          } as React.CSSProperties
        }
      >
        {loading && (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 80 }}
          >
            <IonSpinner name="crescent" />
          </div>
        )}

        {error && (
          <IonText color="danger" style={{ padding: 20 }}>
            <p>{error}</p>
          </IonText>
        )}

        {!loading && !error && deck && (
          <>
            {/* Hero image — full bleed to top of screen */}
            <div
              style={{
                width: "100%",
                height: 260,
                background: "var(--ion-color-primary-tint)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {deck.image ? (
                <img
                  src={deck.image}
                  alt={deck.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              ) : (
                <IonIcon
                  icon={layersOutline}
                  style={{ fontSize: 72, color: "var(--ion-color-primary)" }}
                />
              )}

              {/* Floating back button */}
              <div
                style={{
                  position: "absolute",
                  top: "calc(var(--ion-safe-area-top) + 8px)",
                  left: 8,
                  zIndex: 10,
                  background: "rgba(0,0,0,0.30)",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => history.goBack()}
                  style={
                    {
                      "--color": "white",
                      "--padding-start": "0",
                      "--padding-end": "0",
                    } as React.CSSProperties
                  }
                >
                  <IonIcon icon={arrowBackOutline} slot="icon-only" />
                </IonButton>
              </div>
            </div>

            {/* Deck info */}
            <div style={{ padding: "20px 20px 0" }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                }}
              >
                {deck.name}
              </p>

              {deck.description ? (
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "1rem",
                    color: "var(--ion-color-medium)",
                    lineHeight: 1.5,
                  }}
                >
                  {deck.description}
                </p>
              ) : null}

              <IonButton
                expand="block"
                style={{ marginBottom: 28 }}
                onClick={() => history.push(`/practicar/${id}`)}
              >
                <IonIcon icon={playOutline} slot="start" />
                Practicar
              </IonButton>
            </div>

            {/* Cards section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                marginBottom: 12,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>
                Tarjetas{" "}
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: "0.9rem",
                    color: "var(--ion-color-medium)",
                  }}
                >
                  ({cards.length})
                </span>
              </p>

              <IonButton
                fill="clear"
                size="small"
                onClick={() => setEditing((v) => !v)}
              >
                <IonIcon
                  icon={editing ? eyeOffOutline : eyeOutline}
                  slot="start"
                />
                {editing ? "Ocultar" : "Editar"}
              </IonButton>
            </div>

            {/* Cards list */}
            <div
              style={{
                padding: "0 20px",
                transition: "filter 0.3s ease",
                filter: editing ? "none" : "blur(6px)",
                userSelect: editing ? "auto" : "none",
                pointerEvents: editing ? "auto" : "none",
              }}
            >
              {cards.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--ion-color-medium)",
                    fontSize: "1rem",
                    marginTop: 32,
                  }}
                >
                  No hay tarjetas en este mazo aun.
                </p>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background:
                          "var(--ion-card-background, var(--ion-item-background))",
                        borderRadius: 14,
                        padding: "14px 12px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: "1rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {card.front}
                        </p>
                        <p
                          style={{
                            margin: "3px 0 0",
                            fontSize: "0.9rem",
                            color: "var(--ion-color-medium)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {card.back}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() =>
                            history.push(`/modificar-tarjeta/${card.id}`)
                          }
                        >
                          <IonIcon icon={createOutline} slot="icon-only" />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => setDeleteCardId(card.id)}
                        >
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <IonAlert
          isOpen={deleteCardId !== null}
          header="Eliminar tarjeta"
          message="¿Seguro que deseas eliminar esta tarjeta?"
          buttons={[
            {
              text: "Cancelar",
              role: "cancel",
              handler: () => setDeleteCardId(null),
            },
            {
              text: "Eliminar",
              role: "destructive",
              handler: async () => {
                if (deleteCardId === null) return;
                await deleteCard(deleteCardId);
                setDeleteCardId(null);
                load();
              },
            },
          ]}
          onDidDismiss={() => setDeleteCardId(null)}
        />

        <IonFab
          slot="fixed"
          style={{
            bottom: "calc(var(--ion-safe-area-bottom) + 28px)",
            right: "16px",
          }}
        >
          <IonFabButton onClick={() => history.push(`/agregar-tarjeta/${id}`)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default ViewDeck;
