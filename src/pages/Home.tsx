import { useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonAvatar,
  IonSpinner,
  IonText,
  IonFab,
  IonFabButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonPopover,
  IonButton,
  IonAlert,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  addOutline,
  ellipsisVertical,
  layersOutline,
  createOutline,
  trashOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import {
  initDatabase,
  seedExampleData,
  getUsers,
  getDecks,
  getCards,
  deleteDeck,
} from "../lib/Database";
import type { User } from "../models/User";
import type { Deck } from "../models/Deck";
import type { Card } from "../models/Card";

interface DeckRow extends Deck {
  cards: Card[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const Home: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);
  const [deleteDeckId, setDeleteDeckId] = useState<number | null>(null);
  const popoverRef = useRef<HTMLIonPopoverElement>(null);

  async function load() {
    setLoading(true);
    try {
      await initDatabase();

      const users = await getUsers();
      const currentUser = users[0] ?? null;

      if (!currentUser) {
        history.replace("/bienvenida");
        return;
      }

      setUser(currentUser);
      await seedExampleData(currentUser.id);

      const userDecks = await getDecks(currentUser.id);
      const deckRows: DeckRow[] = await Promise.all(
        userDecks.map(async (deck) => {
          const cards = await getCards(deck.id);
          return { ...deck, cards };
        }),
      );
      setDecks(deckRows);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useIonViewWillEnter(() => {
    load();
  });

  async function openDeckMenu(e: React.MouseEvent, deckId: number) {
    e.stopPropagation();
    setActiveDeckId(deckId);
    if (popoverRef.current) {
      popoverRef.current.event = e.nativeEvent;
      await popoverRef.current.present();
    }
  }

  function closeDeckMenu() {
    popoverRef.current?.dismiss();
    setActiveDeckId(null);
  }

  return (
    <IonPage>
      <IonContent
        style={
          {
            "--padding-top": "calc(16px + var(--ion-safe-area-top))",
            "--padding-bottom": "calc(16px + var(--ion-safe-area-bottom))",
            "--padding-start": "calc(16px + var(--ion-safe-area-left))",
            "--padding-end": "calc(16px + var(--ion-safe-area-right))",
          } as React.CSSProperties
        }
      >
        {loading && (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 60 }}
          >
            <IonSpinner name="crescent" />
          </div>
        )}

        {error && (
          <IonText color="danger">
            <p>Error: {error}</p>
          </IonText>
        )}

        {!loading && !error && user && (
          <>
            {/* Profile row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 32,
              }}
            >
              <IonAvatar style={{ width: 52, height: 52, flexShrink: 0 }}>
                {user.image ? (
                  <img src={user.image} alt={user.name} />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "var(--ion-color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1.43rem",
                      borderRadius: "50%",
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
              </IonAvatar>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.98rem",
                    color: "var(--ion-color-medium)",
                  }}
                >
                  Bienvenido de vuelta
                </p>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "1.43rem",
                  }}
                >
                  {user.name}
                </p>
              </div>
            </div>

            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1.37rem" }}>
                Mis mazos
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "1.04rem",
                  color: "var(--ion-color-medium)",
                }}
              >
                {decks.length} {decks.length === 1 ? "mazo" : "mazos"}
              </p>
            </div>

            {/* Deck list */}
            {decks.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 60,
                  color: "var(--ion-color-medium)",
                }}
              >
                <IonIcon
                  icon={layersOutline}
                  style={{
                    fontSize: 62,
                    display: "block",
                    margin: "0 auto 14px",
                  }}
                />
                <p style={{ margin: 0, fontSize: "1.04rem" }}>
                  Aun no tienes mazos.
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "1.1rem" }}>
                  Presiona + para crear uno.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    onClick={() => history.push(`/ver-mazo/${deck.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background:
                        "var(--ion-card-background, var(--ion-item-background))",
                      borderRadius: 16,
                      padding: "0 0.5rem 0 0",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
                      gap: "1rem",
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                  >
                    {/* Deck image / placeholder */}
                    <div
                      style={{
                        width: "20%",
                        alignSelf: "stretch",
                        flexShrink: 0,
                        position: "relative",
                        background: "var(--ion-color-primary-tint)",
                        overflow: "hidden",
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
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IonIcon
                            icon={layersOutline}
                            style={{
                              fontSize: 34,
                              color: "var(--ion-color-primary)",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Deck info */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "0.85rem 0rem 0.85rem 0rem",
                      }}
                    >
                      {/* Nombre de Mazo */}
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: "1.27rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {deck.name}
                      </p>
                      {/* Descripción de Mazo */}
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "1.01rem",
                          color: "var(--ion-color-medium)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {deck.description}
                      </p>
                    </div>

                    {/* Three-dot menu */}
                    <IonButton
                      fill="clear"
                      size="small"
                      style={{ margin: 0, flexShrink: 0 }}
                      onClick={(e) => openDeckMenu(e, deck.id)}
                    >
                      <IonIcon icon={ellipsisVertical} slot="icon-only" />
                    </IonButton>
                  </div>
                ))}
              </div>
            )}

            {/* Shared popover for deck actions */}
            <IonPopover
              ref={popoverRef}
              onDidDismiss={() => setActiveDeckId(null)}
            >
              <IonList lines="none">
                <IonItem
                  button
                  detail={false}
                  onClick={() => {
                    closeDeckMenu();
                    if (activeDeckId !== null)
                      history.push(`/modificar-mazo/${activeDeckId}`);
                  }}
                >
                  <IonIcon icon={createOutline} slot="start" />
                  <IonLabel>Modificar</IonLabel>
                </IonItem>
                <IonItem
                  button
                  detail={false}
                  onClick={() => {
                    closeDeckMenu();
                    if (activeDeckId !== null) setDeleteDeckId(activeDeckId);
                  }}
                >
                  <IonIcon icon={trashOutline} slot="start" color="danger" />
                  <IonLabel color="danger">Eliminar</IonLabel>
                </IonItem>
              </IonList>
            </IonPopover>

            <IonAlert
              isOpen={deleteDeckId !== null}
              header="Eliminar mazo"
              message="¿Seguro que deseas eliminar este mazo? Esta acción no se puede deshacer."
              buttons={[
                { text: "Cancelar", role: "cancel", handler: () => setDeleteDeckId(null) },
                {
                  text: "Eliminar",
                  role: "destructive",
                  handler: async () => {
                    if (deleteDeckId === null) return;
                    await deleteDeck(deleteDeckId);
                    setDeleteDeckId(null);
                    load();
                  },
                },
              ]}
              onDidDismiss={() => setDeleteDeckId(null)}
            />
          </>
        )}

        {/* FAB — Add deck */}
        <IonFab slot="fixed" style={{ bottom: "calc(var(--ion-safe-area-bottom) + 28px)", right: "16px" }}>
          <IonFabButton onClick={() => history.push("/agregar-mazo")}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Home;
